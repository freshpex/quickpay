# Deploy Quick Pay on Render

`render.yaml` defines a static website (`quickpay-web`) and one free Node web service (`quickpay-api`). The API runs the worker alongside it and stores encrypted evidence in PostgreSQL. The website is a Next.js static export served from `apps/web/out`; it does not start a Node process or sleep with the backend.

## Existing deployment migration

Render does not convert an existing Node web service into a static site in place. Create a **Static Site** from this repository with the settings below, verify it, then move the website domain to it. Keep the old service until the replacement works. To retain the exact `quickpay-web.onrender.com` hostname, release that name on the old service and assign it to the static site in Render; confirm hostname availability before removing the old service.

- Build: `corepack enable && corepack prepare pnpm@11.19.0 --activate && pnpm install --frozen-lockfile --prod=false && pnpm --filter @quickpay/web build`
- Publish directory: `apps/web/out`
- Use the routes, headers and build environment from `render.yaml`. Do not set an app-level root directory; this is a monorepo.
- Set `WEB_ORIGIN` on the API to the final frontend origin. The static site's build needs the same value for metadata. Rebuild when changing it.
- The first rewrite proxies `/api/v1/*` to `https://quickpay-api.onrender.com/api/v1/*`. If Render assigned a different API hostname, change that destination to the actual public API URL. This same-origin proxy preserves auth cookies and evidence URLs.
- The receipt rewrite serves a static shell for legacy `/transactions/:transactionId` links. New navigation uses `/transactions/detail?id=...`; private transaction data is fetched in the browser after authentication.

For a fresh deployment, connect the repository with **New → Blueprint** and use `render.yaml`. Review the static site and API settings before applying.

## API settings

Supply `DATABASE_URL` (Neon pooled URL), `DATABASE_URL_UNPOOLED` (same database's direct URL), `WEB_ORIGIN` (frontend HTTPS origin), `API_ORIGIN` (API HTTPS origin), and one stable 64-character hexadecimal `DATA_ENCRYPTION_KEY`. Keep the encryption key backed up: changing it makes existing encrypted evidence unreadable. Render generates `BETTER_AUTH_SECRET` once.

Supply verified Mailjet credentials and sender settings for authentication emails. Configure provider secrets on the API. Payments, SMS and push are disabled by default; update Blueprint-managed flags in `render.yaml` before syncing so dashboard-only changes are not overwritten. Never commit secrets.

The API start command runs migrations before starting the API and embedded worker. No development customers, balances or transactions are seeded.

## Verification

Run `pnpm deploy:verify https://YOUR-FRONTEND-HOST` after deployment. Expect `200 /`, `200 /healthz`, `200 /api/v1/health`, and `200 /api/v1/health/worker`. Website health is a static response; API health checks PostgreSQL, and worker health checks its heartbeat.

Open the website after the API has idled: the landing and login pages should appear immediately without Render's application-loading screen. Login can still wait for the free API to wake up, with feedback inside the submit button. There is no floating connection banner. Then verify signup, email verification, login, password reset, receipt navigation/refresh, and authenticated evidence access through the website proxy.

Free API instances can sleep; background work pauses while asleep. Use an always-on API plan for continuous worker processing. Static hosting removes frontend cold starts without changing backend availability.
