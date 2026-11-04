# Operations runbook

## Environment separation

Keep distinct PostgreSQL instances/roles, provider credentials, signing secrets, encryption keys, Mailjet keys/sender and private storage for local, staging and production. Configure `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_FROM_EMAIL` and `MAILJET_FROM_NAME` in the worker environment, and restart it after changes. Mailjet API acceptance is not proof of inbox delivery; monitor delivery/bounce events in the Mailjet account. Failed email jobs retain the existing retry/backoff and eight-attempt limit; review/requeue failed jobs after fixing configuration. `PAYMENT_MODE=disabled` is the default. Sandbox mode only uses test credentials. Configure live mode only after business authorization and sandbox verification. The web browser receives no database or provider secret.

Run Node services behind HTTPS with a same-origin `/api/v1` rewrite. Set WEB_ORIGIN and API_ORIGIN correctly at build/runtime. Set secure cookies in production. The reverse proxy must overwrite client-IP headers rather than trusting arbitrary request headers. Restrict database access and outbound provider hosts. Store environment values in the deployment secret manager, never in images or source control.

## Migrations and backups

Use `pnpm db:migrate` as a release job; it tracks ordered migrations and serializes application with an advisory lock. Test migrations against a restored staging copy before production. Take encrypted backups/PITR, define retention and ownership, and prove restoration into an isolated instance. SQL migration rollback is not automatic; use forward corrective migrations. Financial records must not be deleted to repair a rollout.

The local test database `quickpay_test` is disposable and its public schema is recreated by `pnpm test`. Never point this suite at a production database. Explicit TEST_DATABASE_URL must still identify a disposable test environment.

## Job processing

Run `pnpm worker` independently. Jobs are inserted atomically with money reservations. Workers claim with `SKIP LOCKED`; lease tokens prevent stale completion writes. Heartbeats extend 90-second leases. Failures retry exponentially up to eight attempts, then appear in Admin → Operations. Retry only after diagnosing the issue; the action requires a recorded reason. Persisted transfer intent means a retry reconciles an uncertain provider call rather than generating another transfer.

Monitor oldest queued/running job age, failed jobs, database readiness, webhook failure rates, processing transaction age and ledger/account consistency. The health endpoint proves database reachability, not provider success. `receipt` jobs currently rely on persisted in-app receipts; they do not send duplicate receipt emails.

## Reconciliation

The worker schedules unresolved transaction requery and recent successful bill/withdrawal checks. Authenticated provider verification compares transaction identity, amount, currency and destination. Unknown states remain pending. Admin → Transactions → Reconcile queues an additional check with an audit reason. Do not release a reservation just because a request timed out.

Before launch, add a daily provider settlement-statement comparison for collections, payouts, provider wallet funding, fees and disputes. Current automated requery does not prove complete settlement-account matching. Paystack refund/dispute payloads without a direct reference require additional mapping and escalation. Reversals are compensating entries; customer chargeback debt blocks further spend pending recovery review.

Verify invariants regularly: each journal sums to zero; cached account totals equal entry sums; customer available/reserved/reward balances are nonnegative; pending reservations match unresolved obligations; provider references map to the intended internal transactions. Backlog and mismatches require an incident, not direct SQL balance edits.

## Gift-card evidence and review

Private evidence is encrypted on a non-public persistent volume. Limit uploads to validated JPG/PNG under 5 MB. A production malware scanner must inspect evidence inside a controlled environment before an operator with `evidence.scan` marks it clean. The UI’s clean action records the external check and reason; it is not an embedded antivirus product. Reviewers then verify supported brand/region/type, authenticity, ownership and remaining value. Reject with a meaningful reason or approve the verified quote. A second administrator with `gift.settle` supplies the settlement verification reference and reason. No upload, quote or single review auto-credits money.

Production needs a shared durable evidence volume or a tested private object-store adapter, encrypted backups, key rotation, a documented retention schedule and tested deletion workflows. Filesystem uploads are not suitable for ephemeral serverless disks.

## Admin access and incident response

Provision explicit permissions through a reviewed operator process. MFA enrollment alone does not unlock admin endpoints; the current session needs an authenticator confirmation every 15 minutes. Never send OTPs, evidence, passwords, keys or raw provider errors to customer support logs. Correlation IDs allow support to locate structured request failures.

For suspected fraud, set an audited referral hold; new awards stop without rewriting historical rewards. A hold is a manual risk control, not a claim of automated fraud detection. Define responsible staff, escalation timing, kill switches, provider incident contacts, rate/limit policy and after-hours ownership before release.
