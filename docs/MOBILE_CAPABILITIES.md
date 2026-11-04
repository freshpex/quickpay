# Native customer capability map

Inspected 4 November 2026 against actual module handlers, shared schemas, auth configuration and customer website implementations. All paths below are under `/api/v1`. The native client uses the same PostgreSQL records and existing financial engine.

| Mobile journey | Existing API | Findings / genuine gaps |
|---|---|---|
| Register, verify, recover | `/auth/sign-up/email`, `/auth/send-verification-email`, `/auth/verify-email`, `/auth/request-password-reset`, `/auth/reset-password` | Shared signup schema and server policy acceptance preserved. Emails currently return to web; configured verified web links can open the app. |
| Session, logout, password | `/auth/sign-in/email`, `/auth/get-session`, `/auth/sign-out`, `/auth/change-password` | Better Auth bearer plugin already enabled. Read `set-auth-token`, use OS secure storage. Sliding session renewal uses get-session; no invented refresh token. MFA challenge requires secure challenge-cookie handling. |
| Dashboard / wallet | `/wallet`, `/payments`, `/notifications` | Exact kobo strings. Deposit/withdrawal availability, methods and existing fixed limits/fees are not exposed: add read-only wallet capabilities. |
| Deposit | POST `/deposits`, GET `/payments/{id}`, POST `/payments/{id}/check` | Hosted Paystack checkout URL comes from worker. Return/foreground triggers status fetch, never credit. |
| Withdraw | `/banks`, `/banks/resolve`, POST `/withdrawals` | Password authorization and owned destination validation expire after 10 minutes. Same scoped idempotency key on manual retry. |
| Airtime / data / bills | `/catalog`, `/catalog/{id}/plans`, `/billers/validate`, POST `/payments` | Category availability, limits and fee from catalog. Fixed-plan amounts rechecked server-side. Electricity uses prepaid/postpaid validation. |
| History / receipts | GET `/payments?before=…`, `/payments/{id}`, POST `/payments/{id}/check` | Owned cursor pagination; native filtering/search across fetched pages. Verified fulfillment in details only. Missing recovery lookup by idempotency key: add ownership-scoped read. |
| Saved recipients | GET/POST/DELETE `/beneficiaries` | Existing phone/bill recipients only; no invented bank-beneficiary persistence. |
| Sell gift cards | `/gift-cards/products`, `/quotes`, `/evidence`, `/sales` | Ten-minute server quote; JPG/PNG up to 5 MiB, encrypted private files, quarantine/review. Upload never credits wallet. |
| Buy gift cards / exchange | `/gift-cards/purchases`, `/exchanges` | Buying explicitly unavailable; exchange pairs empty. Show backend unavailability, no invented supplier or rates. |
| Referrals / rewards | `/referrals`, `/rewards/active-rule`, `/rewards/{id}/claim` | Original rule summaries, eligibility and claimability. Claim idempotent by reward identity. Native share uses configured site. |
| Profile / phone security | GET/PATCH `/profile`, `/verification/capabilities`, `/verification/phone/send`, `/verification/phone/verify` | No identity provider configured. Phone actions use existing challenge and server limits. |
| Notifications / preferences | GET/PATCH `/notifications` | Inbox supported. Device-token registration, preferences and push delivery absent: add backward-compatible owned device/preferences endpoints and durable push integration, disabled until configured. |
| Support | GET/POST `/support` | Existing subject/message and optional owned transaction ID. No attachment endpoint; do not invent public uploads. |

Money and ledger semantics stay unchanged. No new wallet, reward engine, authentication database or admin application. Mobile receives no provider credentials or database imports.
