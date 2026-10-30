# Lettertrace AI Gateway cutover

Status: source preparation with an explicitly authorized production Git
auto-deploy pause recorded below. Provider inference, database migration,
schedule activation, restart and deployment remain held.

## Result and scope

New router credentials use `ai-gateway`. Existing SDKs, the encrypted BYOK key
store, per-user RLS, key verification, run resolvers and native citation parsers
remain the owners. Concentrate, Merge, direct provider keys and existing trial
funding stay available. Gateway is not a new answer engine: `runs.provider` still
records Anthropic/OpenAI/Google, while `runs.route` records `ai-gateway`.

`RouterId` contains active dispatch options. `StoredRouterId` additionally
recognizes historical `openrouter` receipts and retired key summaries. That
historical identity cannot be parsed as an active route. Dispatch readers skip
retired/old-router keys before decryption. Dashboard and CLI still show their
safe hints and permit owner-scoped removal. Saving a new Gateway key verifies it,
then encrypts it as a separate row. Never rename an old credential to Gateway.

Old run routes, model names, answers, response IDs and encrypted key bytes remain
unchanged. The schema adds `router_keys.retired_at`; only old-router rows receive
that timestamp. Their original endpoint and search verification remain retained
provenance. Database guards reject new old-router credentials/runs and prevent
relabeling old credentials/runs, including through service-role writers. An
existing run may still settle status/output under its original route. Deleting
a retired key does not delete paid run/response history.

## Transport and native search

| Engine | Gateway path | Search behavior |
| --- | --- | --- |
| Claude | Anthropic SDK, `https://ai-gateway.vercel.sh/v1/messages`, `x-api-key` | Existing native `web_search_20250305` tool and forced choice; original inline/retrieved citations. Search rejection is not retried as an ungrounded answer |
| ChatGPT | Existing raw Responses adapter, `https://ai-gateway.vercel.sh/v1/responses`, bearer key | Native `web_search` tool with forced choice; original URL citations or searched-source receipts |
| Gemini | OpenAI SDK compatible Chat Completions, `https://ai-gateway.vercel.sh/v1/chat/completions` | Utility/ungrounded work only. Grounded monitoring refuses this route before dispatch |

`providerOptions.gateway.only` pins the selected engine's native provider for
measurement continuity. Google uses Gateway upstream ID `vertex`, preserving
this replaced route's previous Vertex intent (`google` is AI Studio). The public
[Gemini endpoint metadata](https://ai-gateway.vercel.sh/v1/models/google/gemini-2.5-flash/endpoints)
confirms those distinct IDs. No fallback model list, old router policy, search plugin
or third-party search substitute is sent. An unavailable route fails visibly;
there is no automatic direct-provider hop. Existing native adapters continue to
own their transient retry/deadline behavior.

The public Gateway catalog was checked on 2026-10-30. Existing Claude 4.8/4.6/4.5
IDs map to the exact dotted Gateway versions; Sonnet 5 keeps its exact ID.
Existing Google aliases retain this route's explicit 2.5 mappings. GPT-4 Turbo
was absent from that catalog: Gateway routing returns no slug rather than
silently substituting a model. Direct GPT-4 Turbo support remains unchanged.
Adding another model follows the existing catalog/registry owner, not a runtime
catalog allowlist.

These are candidate compatible request shapes, not live acceptance. The existing
key-save owner runs a real reachability call and native-search probe for each
supported engine. It saves only the search capabilities actually observed on
that credential. No old search-verification set is transferred to the new key.
Real search execution, entitlement, model equivalence, latency, actual charges
and invoice/response correlation remain keyed acceptance work.

Current source references:
[Gateway native search](https://vercel.com/docs/ai-gateway/models-and-providers/web-search),
[Messages API](https://vercel.com/docs/ai-gateway/sdks-and-apis/anthropic-messages-api),
[Responses API](https://vercel.com/docs/ai-gateway/sdks-and-apis/responses),
[provider filtering](https://vercel.com/docs/ai-gateway/models-and-providers/provider-filtering-and-ordering).

## Isolated proof and migration artifact

Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, and:

```sh
./scripts/test-router-migration.sh
```

The extra lane creates a disposable PostgreSQL 16 container with fake Supabase
auth identities, no published ports and no application/provider environment. It
assembles the full fresh schema, reconstructs pre-cutover rows, applies the exact
migration twice, and verifies encrypted/history preservation, new active routes,
retired dispatch refusal, owner removal and cross-owner RLS. It removes only its
own test container/storage. Wire tests use fake keys and intercepted fetch calls.

The two `AI_GATEWAY_CUTOVER` sections in `supabase/schema.sql` are the canonical,
reviewable migration. Prepare a local artifact without connecting to a database:

```sh
{
  echo 'BEGIN;'
  awk '/^-- BEGIN AI_GATEWAY_CUTOVER/{emit=1} emit{print} /^-- END AI_GATEWAY_CUTOVER/{emit=0}' supabase/schema.sql
  echo 'COMMIT;'
} > /tmp/lettertrace-ai-gateway-cutover.sql
```

Review that artifact before the eventual operator application. Do not apply the
whole schema merely to migrate routers: it also owns unrelated application
changes. The new source reads `retired_at`, so this migration must precede its
release. The hosted schema-drift CI job uses the Supabase Management API; it is
not an offline gate and was not invoked during this key-free packet.

## Authorized source-merge pause and held release

At 2026-10-30 21:10 UTC, the release coordinator authorized disabling only
production Git auto-deploy through Railway's supported
`serviceInstanceAutoDeployUpdate(enabled: false)` control. The readback changed
`enabled: true` to `false`; the repository remains connected. No source pin,
restart, deployment or database write was performed. This decouples the
source-only merge from the held runtime cutover.

| Target | Address |
| --- | --- |
| Railway project | `lettertrace-evident`, `72c47487-8de8-4805-a051-f0410c298413` |
| Environment | `production`, `73c29edf-942d-4017-a128-24c8604b15ed` |
| Service | `lettertrace`, `def087e4-4c0f-4a6c-8b63-06267dce91a8` |
| Previous trigger | This repository's `master`, `checkSuites: false` |
| Current Git auto-deploy | Disabled; retain this hold until W10 |
| Deployment state before/after pause | Already offline, no active deployment; latest `ce57dc60-dfcd-47e8-92a2-78e26264558d` remained `FAILED` from 2026-10-08 |

There was no running deployment to restart or replace. The GitHub container
workflow still publishes its default-branch `latest` image on a `master` push;
that publication does not deploy this Railway service. Do not reconnect the
source, select Deploy Latest Commit or restore auto-deploy merely because the
source PR is merged. The documented
[Git auto-deploy control](https://docs.railway.com/deployments/github-autodeploys#disable-automatic-deployments)
only pauses future commit-triggered deployments.

`AI_GATEWAY_API_KEY_STAGED`, if placed on the service, is intentionally unused
escrow. Lettertrace reads no shared Gateway environment credential. Before use,
the fresh key must enter through the existing per-owner encrypted router-key
settings/API owner; key saving itself makes paid verification/search calls.
Staging a secret does not verify it or create a usable router row.

1. Complete separately authorized bounded G1 validation on the reviewed new
   source in an isolated instance/disposable database. Arrange a finite API-key
   budget, enter the fresh key through the existing encrypted key owner and
   validate exact models, native search/citations, usage and charges. Team
   credits are not an API-key budget. No G1 provider calls occurred in this packet.
2. At W10, stop affected AI admission on every instance, including utilities,
   scheduled work, key verification and continuations. Drain accepted work and
   keep its original results/charges; do not issue replacement calls to finish a
   queue. Review unresolved paid work through its existing operator owner.
3. Keep all old-code workers stopped while applying the reviewed schema sections
   under the release owner's migration procedure; older utility readers do not
   understand retired keys. Enter/verify the new production credential through
   the same addressed encrypted-key owner under G1. The new source can execute
   that owner independently of the old deployed application. Never relabel an
   old credential or manufacture its search-verification result.
4. Explicitly deploy the reviewed new image only after the schema/key gates are
   satisfied. Confirm runtime compatibility and retained reads before reopening
   the sole new path. Existing schedules and trial funding are not changed by
   the source merge. Restore the previous Git auto-deploy setting (`true`,
   intended source branch `master`) only at the accepted W10 release, with an
   explicit readback. Do not restore it during source preparation.
5. Preserve status/result reads and completed provenance. Retired credential
   removal/revocation follows original-charge reconciliation and ownership
   checks. No database migration, live test or cutover is authorized by the
   source-merge pause alone.

After this barrier, an old OpenRouter-capable image is not an automatic rollback.
Pause affected admission and repair a validated new-path artifact. Never rename
historical routes, copy old encrypted credentials into a Gateway row or replay a
paid request to make the cutover look complete.

## Residual old-provider references

`StoredRouterId`/historical label/deletion parsing, retired endpoint refusal,
SQL retirement and write guards, this migration document and negative fixtures
retain the old identity intentionally. The active registry, key-save options,
probe script selectors and environment examples do not offer it for new work.
The unused old-router logo is removed. Generic product/default routes and held
paid pilots/schedules are not activated by these changes.
