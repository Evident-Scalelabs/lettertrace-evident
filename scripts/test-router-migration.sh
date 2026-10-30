#!/usr/bin/env bash
# Local-only PostgreSQL proof. No .env, remote database or provider is read.
set -euo pipefail
cd "$(dirname "$0")/.."
TEST_CONTAINER="lettertrace-router-cutover-$$-${RANDOM}"
trap 'docker rm -fv "$TEST_CONTAINER" >/dev/null 2>&1 || true' EXIT
docker run --detach --rm --name "$TEST_CONTAINER" --tmpfs /var/lib/postgresql/data \
  --env POSTGRES_PASSWORD=local-fixture postgres:16-alpine >/dev/null
for _ in {1..60}; do
  if docker exec "$TEST_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
sql() { docker exec -i "$TEST_CONTAINER" psql -Xq -v ON_ERROR_STOP=1 -U postgres; }
sql <<'SQL'
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;
SQL
# Fresh schema assembly, using fake Supabase auth ownership only.
sql < supabase/schema.sql >/dev/null
sql <<'SQL'
grant select, insert, update, delete on all tables in schema public to authenticated;
insert into auth.users values ('11111111-1111-1111-1111-111111111111', 'owner@fixture.invalid'),
  ('22222222-2222-2222-2222-222222222222', 'other@fixture.invalid');
insert into public.projects (id, user_id, name, brand_name) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'fixture', 'fixture');
-- Reconstruct the pre-cutover writable state without copying the whole schema.
drop trigger guard_retired_router_key on public.router_keys;
drop trigger guard_retired_run_route on public.runs;
alter table public.router_keys drop constraint router_keys_router_check;
insert into public.router_keys (user_id, router, encrypted_key, key_hint, base_url, search_verified)
  values ('11111111-1111-1111-1111-111111111111', 'openrouter', 'v1:original-encrypted-fixture-bytes',
  'old-hint', 'https://openrouter.ai/api/v1', '{anthropic}');
insert into public.runs (id, project_id, provider, model, status, route) values
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
   'anthropic', 'original-model', 'running', 'openrouter');
insert into public.responses (run_id, project_id, provider, model, response_text) values
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
   'anthropic', 'original-model', 'original paid answer bytes');
SQL
# The exact marked sections are the reviewable operational migration, in a
# single transaction. Run twice to prove replay does not rewrite retired data.
for _ in 1 2; do
  { echo BEGIN\;; awk '/^-- BEGIN AI_GATEWAY_CUTOVER/{emit=1} emit{print} /^-- END AI_GATEWAY_CUTOVER/{emit=0}' supabase/schema.sql; echo COMMIT\;; } | sql
 done
sql <<'SQL'
do $$ begin
  if not exists (select 1 from public.router_keys where router='openrouter' and retired_at is not null
    and encrypted_key='v1:original-encrypted-fixture-bytes' and base_url='https://openrouter.ai/api/v1'
    and search_verified='{anthropic}') then raise exception 'retired key provenance changed'; end if;
  if not exists (select 1 from public.runs where route='openrouter' and model='original-model')
    or not exists (select 1 from public.responses where response_text='original paid answer bytes')
    then raise exception 'paid history changed'; end if;
  begin
    insert into public.runs (project_id, provider, model, route) values
      ('33333333-3333-3333-3333-333333333333', 'anthropic', 'new-model', 'openrouter');
    raise exception 'new legacy dispatch admitted';
  exception when check_violation then null; end;
  begin
    update public.router_keys set router='ai-gateway' where router='openrouter';
    raise exception 'old credential relabelled';
  exception when check_violation then null; end;
  begin
    update public.runs set route='ai-gateway' where route='openrouter';
    raise exception 'old run relabelled';
  exception when check_violation then null; end;
end $$;
-- Accepted work can settle without another provider dispatch or route change.
update public.runs set status='completed' where route='openrouter';
set role authenticated;
set request.jwt.claim.sub='22222222-2222-2222-2222-222222222222';
do $$ begin
  if exists (select 1 from public.router_keys) then raise exception 'cross-owner key read'; end if;
  if exists (select 1 from public.runs) then raise exception 'cross-owner run read'; end if;
  begin
    insert into public.router_keys (user_id, router, encrypted_key, key_hint) values
      ('11111111-1111-1111-1111-111111111111', 'ai-gateway', 'fake', 'fake');
    raise exception 'cross-owner key write';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111';
do $$ begin
  if (select count(*) from public.router_keys where router='openrouter') <> 1
    then raise exception 'retired key hidden from owner'; end if;
  begin
    insert into public.router_keys (user_id, router, encrypted_key, key_hint, retired_at) values
      ('11111111-1111-1111-1111-111111111111', 'openrouter', 'fake', 'fake', now());
    raise exception 'new legacy credential admitted';
  exception when check_violation or insufficient_privilege then null; end;
end $$;
insert into public.router_keys (user_id, router, encrypted_key, key_hint) values
  ('11111111-1111-1111-1111-111111111111', 'ai-gateway', 'new-encrypted-fixture', 'gateway-hint');
insert into public.runs (project_id, provider, model, route) values
  ('33333333-3333-3333-3333-333333333333', 'anthropic', 'new-model', 'ai-gateway'),
  ('33333333-3333-3333-3333-333333333333', 'anthropic', 'same-model', 'merge'),
  ('33333333-3333-3333-3333-333333333333', 'anthropic', 'same-model', 'concentrate');
delete from public.router_keys where router='openrouter';
do $$ begin
  if exists(select 1 from public.router_keys where router='openrouter') then raise exception 'owner cannot remove retired key'; end if;
  if not exists(select 1 from public.responses where response_text='original paid answer bytes') then raise exception 'key removal erased history'; end if;
end $$;
SQL
printf 'Router cutover: fresh schema, idempotent migration, encrypted/history preservation, active dispatch and RLS passed.\n'
