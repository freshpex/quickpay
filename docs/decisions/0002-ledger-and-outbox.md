# ADR 0002: Exact ledger and PostgreSQL durable jobs

Accepted. Money is integer kobo in bigint columns. Immutable, balanced journals are authoritative; trigger-maintained totals are transactionally locked projections. Reservations separate available funds from pending obligations. Refunds and chargebacks compensate history.

The outbox and job queue share the financial database. `SKIP LOCKED`, renewable leases, dedupe keys, bounded exponential retries and failed-job admin controls provide durable orchestration without Redis. External side effects are at-least-once delivery problems; persisted transfer intent and provider reconciliation protect against blind retries. This is an intentionally small purpose-built durable job implementation and requires operational monitoring of queue age and failures.

Tradeoff: jobs consume PostgreSQL capacity and successful rows need a retention policy. Notifications and provider processing may eventually move behind a dedicated broker without changing the domain contracts.
