# Quick Pay

A Next.js App Router monorepo for everyday Nigerian payments. The expressive marketing site sits beside a customer app, permission-controlled admin tools, a versioned API, PostgreSQL ledger and durable worker.

**Development implementation. Not a production-readiness claim.** Provider sandbox/live transactions, commercial gift-card access, SMS delivery verification and production operating controls need the setup recorded in [external dependencies](docs/EXTERNAL_DEPENDENCIES.md). Unconfigured payments fail closed.

## Run locally

Requires Node 22.14+, pnpm 11.19.0, Docker Compose, and available ports 3000, 3001 and 55432. Transactional email uses Mailjet.

```sh
pnpm install --frozen-lockfile
pnpm setup:local
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

In another terminal:

```sh
pnpm worker
```

- Web: http://localhost:3000
- API readiness: http://localhost:3001/api/v1/health
- OpenAPI JSON: http://localhost:3001/api/v1/openapi
- Swagger UI: http://localhost:3001/docs (viewer assets require access to unpkg)

`setup:local` creates ignored server environment files with random local secrets if they are absent. The example environment contains no real credentials. The seed creates **disabled catalog inventory only**, with zero financial activity, no users and no invented bank accounts. For local HTTP, do not set `NODE_ENV=production`; secure production cookies require HTTPS.

Before using signup verification or password reset, fill `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` and `MAILJET_FROM_EMAIL` in the root `.env` read by the worker. `MAILJET_FROM_NAME` defaults to `Quick Pay`. Use a sender email verified in your Mailjet account. Restart the worker after changing these settings. Emails remain durable queued jobs and follow the existing retry policy if configuration is missing or Mailjet rejects the submission. The API/web `.env.local` files also contain the new placeholders; provider credentials stay server-side. See [Mailjet setup](docs/integrations/PROVIDERS.md#identity-and-contact-verification).

The phone field is normalized and stored. Termii SMS verification is implemented but unavailable until its account-specific base URL, API key and approved sender are configured with SMS_ENABLED=true. The UI never marks it verified automatically.

## Applications and packages

| Boundary | Responsibility |
|---|---|
| `apps/web` | Marketing, auth, customer and admin App Router pages; Tailwind; Motion |
| `apps/api` | Next.js Route Handlers under `/api/v1`; feature modules and server infrastructure |
| `apps/worker` | PostgreSQL durable job leases, provider processing, email and reconciliation |
| `packages/contracts` | Browser-safe Zod contracts, exact-money helpers and reward rules |
| `packages/api-client` | Typed fetch transport and safe API errors |
| `packages/database` | Server-only Drizzle schema, PostgreSQL pool and ordered SQL migrations |

## Administration

There is no default administrator. Register and verify a local account, then explicitly grant it a role with:

```sh
pnpm admin:grant --email your-local-account@example.com
```

This command is development-only and refuses production. Set up an authenticator in Settings, sign in with it, and enter a fresh code in the admin console. Every protected admin endpoint requires explicit permission and a session-specific elevation expiring after 15 minutes. Production provisioning must use a reviewed operational process and least privilege; no public endpoint can grant roles.

Gift-card review and settlement require different administrators. Evidence must pass an external safety check before an authorized operator marks it clean. Never use arbitrary uploaded evidence as proof of card value. See [operations](docs/operations/RUNBOOK.md).

## Validation

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Tests require a disposable `quickpay_test` database on the local PostgreSQL instance. They rebuild its public schema. A non-local database requires an explicit `TEST_DATABASE_URL`. Browser tests use installed Microsoft Edge by default; change `channel` in `playwright.config.ts` if needed. Financial UI fixtures exist only in the browser test harness; they do not become provider adapters or application seed data.

See [verification](docs/VERIFICATION.md), [implementation checklist](docs/IMPLEMENTATION.md), [API guide](docs/API.md), [architecture](docs/architecture/OVERVIEW.md), [provider setup](docs/integrations/PROVIDERS.md) and [asset register](docs/ASSETS.md).
