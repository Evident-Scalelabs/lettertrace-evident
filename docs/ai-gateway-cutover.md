# Lettertrace AI Gateway cutover

Status: source preparation only. No provider key, hosted database/config change,
paid request, schedule activation or deployment is part of this packet.

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

## Coordinated release, held pending keys

1. Stop affected AI admission on every instance, including utilities/key
   verification, scheduled work and continuations. Drain accepted work and keep
   its original results/charges; do not issue replacement calls to finish a queue.
2. Review original-route counts and unresolved paid work through the existing
   operator owner. Stop all old-code workers before applying the prepared SQL;
   older utility readers do not understand retired keys.
3. Apply the reviewed schema sections under the release owner's migration
   procedure, then deploy the reviewed new image. Neither operation is performed
   by this packet. Existing schedules and trial funding are not changed here.
4. Arrange fresh Gateway keys through the existing secure BYOK settings/API
   owner. Key saving itself makes paid verification/search calls, so perform it
   only during bounded keyed acceptance. No shared environment key fallback is
   added. Team credits are not an API-key budget; arrange finite external key
   budgets before testing.
5. Validate actual model/search/citation behavior, usage and charges on original
   payloads. Reopen only the sole new path after those gates pass. Preserve
   status/result reads throughout. Retired credential removal/revocation follows
   original-charge reconciliation and ownership checks.

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
