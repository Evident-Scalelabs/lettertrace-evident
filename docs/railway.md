# Evident Lettertrace on Railway

Deploy this fork's Dockerfile as its own Railway service. The database and auth
backend must be a dedicated Supabase stack: plain Postgres does not provide
the Auth and PostgREST interfaces this application uses. The deployment decision
is to keep the entire stack on Railway, without a Supabase Cloud account.
See [the self-hosting assessment](railway-supabase-assessment.md) before adding
the backend services.

1. Provision the dedicated Supabase backend in the same Railway project. Verify
   its database roles, Auth migrations, shared signing keys and REST role
   switching, then apply `supabase/schema.sql` through its SQL editor or a private
   database connection. Do not apply this schema to Evident's existing database.
2. Set these variables on the Railway app service:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required for REST API/MCP access and cron)
   - `ENCRYPTION_KEY` (32 random bytes encoded as base64; keep it stable)
   - `CRON_SECRET` (random secret)
   - `NEXT_PUBLIC_SITE_URL` (the Railway service's public HTTPS origin)
   - `PORT=3000`
   - `TRIAL_RUN_LIMIT=0` and `TRIAL_SPEND_LIMIT_USD=0` for this BYOK deployment
3. On the Auth service, set `GOTRUE_SITE_URL` to the app's public origin and
   `GOTRUE_URI_ALLOW_LIST` to `<origin>/auth/callback`. Configure SMTP for
   confirmation and password recovery emails; the template's default
   auto-confirm setting is a separate configuration decision.
4. Deploy and verify `/login`, account creation/sign-in, and a saved project.
   Add provider credentials through the application's Settings. Issue an API
   key in Settings → API & MCP when the Evident pilot adapter is ready.

Keep optional third-party analytics and operator-funded trial keys unset.
Scheduled monitoring needs an explicit scheduler calling the authenticated
`/api/cron/run` endpoint; `vercel.json` schedules are not installed by Railway.
No scheduler or Evident integration is enabled by this deployment setup.

Next.js 15 requires promised route parameters and awaited cookie access. The
server Supabase client awaits cookies at its owning boundary; browser clients
remain synchronous. The MCP SDK override keeps the existing handler on its
1.x SDK API while selecting a patched SDK. The PostCSS override patches the
framework's bundled dependency without a second framework major upgrade.
