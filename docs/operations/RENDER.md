# Deploy Quick Pay with a Render Blueprint

The root `render.yaml` creates three services in Frankfurt: a public Next.js web service, a Next.js API service and a durable background worker. They share your existing Neon PostgreSQL database; no second Render database is created. The API gets a persistent `/var/data` disk for encrypted gift-card evidence. These are paid plans; review Render's price estimate before applying the Blueprint. No resources have been created by this local preparation.

## First deployment

1. Put this repository in GitHub/GitLab/Bitbucket and push the source, lockfile, brand pack and `render.yaml`. Keep `.env`, `.env.local`, `.next*`, `.local` and credentials out of Git. All services use the repository root; do not set `rootDir` to an individual app because packages and assets are shared.
2. In Render choose **New → Blueprint**, connect the repository, and select `render.yaml`. Review the three services and disk before creating them.
3. Supply the API's requested environment values. The Blueprint shares the relevant values with the worker and the public origin with the web service; do not create different auth/encryption secrets for each service.

| Setting                                  | Value                                                                                                                                                                                                                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                           | Existing Neon pooled URL (hostname contains `-pooler`) for application traffic.                                                                                                                                                                                                               |
| `DATABASE_URL_UNPOOLED`                  | Direct URL for the same Neon endpoint/database, without `-pooler`, for migrations and maintenance. The local `DATABASE_URL_UNPOOLING` spelling is supported as an alias.                                                                                                                      |
| `WEB_ORIGIN`                             | Exact public HTTPS frontend URL, without a trailing slash. Use your custom domain or the actual `quickpay-web` Render URL. If Render assigns a suffix, copy the URL shown on the web service, update this value on `quickpay-api`, then sync/redeploy the Blueprint before creating accounts. |
| `DATA_ENCRYPTION_KEY`                    | One stable 64-character hexadecimal key. Generate once with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep it backed up privately; changing it makes previously encrypted evidence/references unreadable.                                                   |
| `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`  | Matching Mailjet account credentials.                                                                                                                                                                                                                                                         |
| `MAILJET_FROM_EMAIL`                     | A verified, active Mailjet sender email, without a display name.                                                                                                                                                                                                                              |
| Optional Paystack/VTpass/Termii settings | Leave empty until configuring the corresponding provider. Initial payments and SMS are disabled. These deployment settings are independent of local `.env` values.                                                                                                                            |

`BETTER_AUTH_SECRET` is generated once by Render. The frontend's internal API address comes from `API_HOSTPORT`; no hardcoded `localhost` rewrite is used on Render. Node and pnpm versions are pinned. The worker receives the same pooled/direct database URLs and provider settings as the API through Blueprint references. Keep TLS enabled on both Neon URLs.

4. Wait for API, web and worker to report a successful deploy. Migrations run in the API pre-deploy hook and again idempotently before API/worker startup, so a fresh worker cannot begin against a missing schema. Services refuse startup when required origin/email/storage settings are missing. The deployment does not seed fake gift-card rates, customers, balances or transactions.
5. Verify all four endpoints through the public frontend:

```sh
pnpm deploy:verify https://YOUR-FRONTEND-HOST
```

Expected: `200 /`, `200 /healthz`, `200 /api/v1/health`, `200 /api/v1/health/worker`. The API health checks PostgreSQL; frontend health checks the API. Worker health requires a heartbeat newer than two minutes. The worker refreshes it every 30 seconds and exits after sustained database failures so Render can restart it. Render has no HTTP health-check field for background workers; monitor this endpoint with an uptime monitor and enable Render deploy/crash notifications.

6. Create a real account, confirm the verification email reaches the intended inbox, verify the link, sign in, and complete a password reset. Queue completion means Mailjet accepted the message; inspect Mailjet's activity for delivered/bounced status. Check worker logs for `worker_started` and any `job_retry` / `job_failed` events.

## Provider settings and updates

Configure provider secrets on `quickpay-api`. To change Blueprint-managed non-secret flags (`PAYMENT_MODE`, `VTPASS_ENV`, `PAYSTACK_TRANSFERS_ENABLED`, `SMS_ENABLED`), edit their values in `render.yaml`, commit/push and sync the Blueprint; dashboard-only changes to these managed defaults can be overwritten on the next sync. Then redeploy API/worker so referenced secrets are refreshed. `PAYMENT_MODE` is `disabled`, `sandbox` or `live`; it is never `enabled`. The worker uses Paystack/VTpass credentials for fulfillment; it must be redeployed with the matching settings whenever the API changes. Keep services in the same region.

Enable catalog entries and reviewed fees/limits through the admin after provider access is verified. Do not run the development seed in production. New environments begin with no enabled payment products. Use a reviewed production-admin provisioning process; the local `admin:grant` helper intentionally refuses production.

The persistent API disk survives deploys but is single-instance storage. Keep one API instance while using this disk; do not enable API autoscaling or move uploads to ephemeral storage. A disk-attached service can have downtime during deploys. Keep encryption-key backups, evidence retention/deletion procedures and restore tests. Database migrations are additive and advisory-locked; failed migrations prevent startup rather than continuing with an incompatible schema.

## Validate before applying

```sh
render blueprints validate render.yaml --output json
```

The Render CLI requires a valid signed-in account. Without one, validate the public schema locally:

```sh
python -m pip install pyyaml==6.0.3 jsonschema==4.25.1
python scripts/validate-blueprint.py
```

The local schema checker also checks service references and evidence-disk wiring. Schema/build/browser checks cannot prove deployment, account-specific platform constraints or live provider delivery. The CLI validation attempted during preparation returned 401 Unauthorized; no deployment was performed.

References: [Blueprint specification](https://render.com/docs/blueprint-spec), [deploy lifecycle](https://render.com/docs/deploys), [Node version](https://render.com/docs/node-version), [monorepos](https://render.com/docs/monorepo-support).
