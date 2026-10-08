# Railway Supabase assessment — 2026-10-08

The requested topology keeps Lettertrace and its dedicated backend on Railway.
No Supabase Cloud account is required. No database services have been provisioned
as part of this assessment.

## Required components

| Component | Lettertrace use |
| --- | --- |
| Dedicated Postgres with persistent volume | Relational tables, RLS policies and SQL RPC functions |
| Supabase Auth / GoTrue | Sign-up, login, sessions and admin user lookup |
| PostgREST | All SDK table queries and RPC calls |
| API gateway | Public `/auth/v1` and `/rest/v1` endpoints under one HTTPS origin |
| Studio + postgres-meta | Optional operator UI for SQL and user/database administration |

Inspection found no Supabase Storage, Realtime or Edge Function consumers in
the app. There is no embedding/vector requirement in Lettertrace's schema.
The existing Hindsight learning service remains separate from this deployment.

## Template assessment

The closest small ready-made candidate is
[Supabase (Self-Hosted, Full Stack)](https://railway.com/template/supabase-self-hosted-full-stack).
Its declared seven services are Postgres, Auth, PostgREST, Kong, Studio,
postgres-meta and Storage. It uses published upstream component images and
includes database/storage volumes. It is community-maintained, not Railway
verified, and has not been deployed or accepted by this assessment.

The `supabase` and `supabase-railway` templates each declare ten services. They
also include components this application does not consume and build several
services from third-party wrapper repositories. They offer more features but
need a larger source/configuration review.

Do not add another standalone Postgres or pgvector service beside a Supabase
template: the template already includes its dedicated database.

Before accepting the seven-service candidate:

- Validate database bootstrap and role passwords, not only container health.
- Supply matching JWT_SECRET, ANON_KEY and SERVICE_ROLE_KEY. The latter two
  are signed JWTs, not independent random strings. Explicitly supply ANON_KEY;
  the template declares a self-reference default on Kong.
- Verify unauthenticated, authenticated and service-role REST access separately,
  including isolation between two application accounts.
- Point Auth redirects at Lettertrace, configure confirmation/recovery email,
  and protect the administrative dashboard.
- Keep the database and internal services private; expose only the required
  gateway/app HTTP endpoints. Configure and verify database backup/restore.

Storage is not required by this app. Omitting it requires adjusting the gateway
and exposed schemas, rather than simply deleting a service from a live stack.
Retaining the initial template intact is an operational choice, not an app
dependency.

## Resource implication

[Supabase's official self-hosting guide](https://supabase.com/docs/guides/self-hosting/docker)
lists 4 GB RAM, 2 CPU cores and 40 GB SSD as the minimum for all components, and
permits removing unused services to reduce requirements. These are whole-stack
guidelines, not a measured Railway allocation or price for this deployment.
Even a reduced backend is several running services rather than one database.

Recommended next step: validate the seven-service template's initialization and
key wiring, then provision it into the existing `lettertrace-evident` project.
App deployment fixes and database acceptance are separate gates.
