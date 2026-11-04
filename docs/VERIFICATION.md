# Verification record

Verified locally on 4 November 2026. This is development and local production-build evidence, not production deployment or provider approval.

| Check                                  | Result                                                                                                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency install and frozen lockfile | Passed; pinned dependencies with pnpm 11.19.0                                                                                                                                                                               |
| TypeScript                             | `pnpm typecheck` passed                                                                                                                                                                                                     |
| Lint                                   | `pnpm lint` passed                                                                                                                                                                                                          |
| Production dependency audit            | `pnpm audit --prod --audit-level high`: no known vulnerabilities found                                                                                                                                                      |
| PostgreSQL migrations                  | All eight ordered migrations applied to local PostgreSQL 17                                                                                                                                                                 |
| Safe seed                              | Disabled service inventory only; application DB has zero users and zero financial transactions                                                                                                                              |
| Database/API/domain tests              | Latest Mailjet follow-up: **38 passed** (28 database/API/domain + 10 mocked email tests). Separate disposable `quickpay_test` database. Prior reward-release failure is recorded below.                                     |
| Production builds                      | `pnpm build`: Next.js API and web builds passed                                                                                                                                                                             |
| Browser tests                          | Latest `E2E_USE_PRODUCTION=true pnpm test:e2e`: **13 passed**, installed Microsoft Edge, headless, against local production builds                                                                                          |
| Worker delivery                        | Historical SMTP smoke: durable job completed and Mailpit received it. Superseded by Mailjet; actual Mailjet delivery awaits credentials and sender configuration.                                                           |
| Mailjet adapter                        | **10 mocked tests passed**: Send API request/authentication, missing configuration, invalid recipient, HTTP/per-message rejection, empty/malformed response structure, and network failure propagation. No live email sent. |
| Runtime API smoke                      | `/api/v1/health` returned ok with payment mode disabled; `/api/v1/openapi` returned OpenAPI 3.1.0                                                                                                                           |
| Preview tool                           | In-app and connected-browser tooling returned runtime errors; rendered verification used automated browser tests and captured screenshots                                                                                   |

## Database and API coverage

Tests exercise exact kobo arithmetic and Nigerian phone normalization; signup terms/password confirmation; real account creation and signed email verification; password reset validation; immutable balanced journals; direct balance-edit and journal-append protection; duplicate deposits/webhooks; invalid HMAC; incorrect amount/currency/reference/destination; concurrent reservations; insufficient funds; simulated provider timeouts preserving reservations; failed/reversed transfer releases and compensating entries; idempotency conflicts; reward versions, duplicate prevention, capped sharing between both parties, one-time claims and refund reversal; suspicious referral holds; cross-user ownership; admin permission denial; actual TOTP enrollment and session elevation; audited admin rule persistence; owned, expiring and attempt-limited phone challenges; and gift-card submission/review/separate-operator settlement without automatic credit.

Provider boundaries are simulated where credentials are absent. The phone test intercepts Termii responses. The timeout test rejects fetch with a timeout. No test credential was sent to a live provider. Gift-review operator sessions are authorization fixtures in the disposable test database; the separate MFA test performs actual local authenticator enrollment and elevation.

## Browser coverage and visual evidence

The thirteen browser tests cover JavaScript-disabled content, visible stacking overlap, playable walking media, normal story state changes, reduced motion, pause controls, failed media, all requested viewport widths (360/390/768/1024/1440), signup password/confirmation/terms validation, bill review and processing, bank withdrawal validation and authorization, structured admin rule editing, mobile navigation, unauthenticated APIs and invalid webhook authentication. They also verify original light/dark brand placements, mobile/desktop authentication and customer branding, favicon and Apple icon routes, manifest icon URLs, theme color and working Open Graph/Twitter image responses.

Marketing uses real local assets. Customer/payment/admin browser scenarios use **explicit test-only API fixtures** to exercise UI states without pretending to run provider transactions. Real persistence and authorization are verified separately by database/API tests.

Screenshots were opened and visually inspected, including desktop and narrow layouts, signup, wallet, stacked cards, walking scene and admin rules:

- [Desktop landing](screenshots/landing-1440.png)
- [360px landing](screenshots/landing-360.png), [390px](screenshots/landing-390.png), [768px](screenshots/landing-768.png), [1024px](screenshots/landing-1024.png)
- [Stacked cards](screenshots/stacked-cards.png), [walking scene](screenshots/walking-story.png)
- [Signup at 390px](screenshots/signup-390.png), [wallet at 360px](screenshots/wallet-360.png), [admin rules](screenshots/admin-rewards.png)

Balances, bank names and customer names in browser fixtures are illustrative test inputs, not application seed data or real results. Marketing product previews are visibly labelled illustrations.

## Brand-pack follow-up

Replaced the generated arrow/text mark with the user-supplied `assets/brand/quick-pay-brand-pack-v1` artwork. All 30 published web/mobile-header files and the conventional root favicon match their source bytes by SHA-256/content comparison. Full wordmarks include the name; small product previews use compact symbols. CSS colors already match the pack. The source pack was not edited.

Re-ran lint, root typecheck, the web production build (including static Open Graph generation), and all 13 browser checks successfully. Visually inspected refreshed landing screenshots at 360px and 1440px, mobile signup, and these new screenshots:

- [Dark authentication panel](screenshots/brand-auth-desktop.png)
- [Desktop customer sidebar](screenshots/brand-wallet-desktop.png)
- [Social preview composed with the original logo](screenshots/social-preview.png)

The broader `pnpm test` check reproduced one existing failure twice: `tests/financial.test.ts:813`, “claims an available reward only once and compensates a claimed reward on refund”, expected `available` but received `pending` immediately after release. The other 27 tests passed. This brand update changes no financial application code or financial test fixtures. The cause remains unconfirmed and needs separate investigation; this record does not claim a clean financial suite.

Manifest/icon responses and local rendering are verified; actual iOS/Android home-screen installation and live social crawler caching were not tested. Set the deployed public origin through `NEXT_PUBLIC_SITE_URL` (or `WEB_ORIGIN`) before the production build.

## Mailjet follow-up

Switched the durable email job handler to Mailjet Send API v3.1. Replaced SMTP/MAIL_FROM settings in root `.env`, `.env.example` and both app `.env.local` files with `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_FROM_EMAIL` (blank) and `MAILJET_FROM_NAME=Quick Pay`, preserving unrelated settings. Removed Nodemailer, its types and the Compose Mailpit service. No database or financial application changes were made.

Latest checks passed: lint, root typecheck, **38 tests**, both production builds, Compose configuration validation, and all **13 browser tests** against the updated production builds. The previously observed immediate reward-release assertion passed on this run; its earlier failure and unconfirmed cause remain recorded above. Provider calls in Mailjet tests are mocked, and no actual email was sent. Real account delivery awaits user credentials and a verified sender.

## Not verified

- Actual Mailjet submission/inbox delivery, sender/domain validation, or bounce handling with the user's account. New Mailjet credentials and sender email are intentionally blank.
- Actual Paystack/VTpass sandbox or live collections, payouts, bills, provider-origin webhook delivery or account-specific payload semantics.
- Real Termii SMS delivery, identity/KYC checks or commercial gift-card buying access.
- A complete supplier-specific gift-card purchase/pricing/fulfillment adapter, generic FX settlement, production malware scanning, financial statement matching or complete dispute/chargeback webhook mapping.
- Real mobile devices, accessibility certification, load/chaos testing, independent security/financial audit, backup restoration or production deployment.

See [external dependencies](EXTERNAL_DEPENDENCIES.md) and the [operations runbook](operations/RUNBOOK.md). These local results do not establish production readiness.
