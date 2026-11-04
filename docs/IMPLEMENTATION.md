# Implementation checklist

## Architecture and foundation
- [x] Inspect empty workspace and document project rules.
- [x] Define modular Next.js web/API/worker monorepo, typed contracts and PostgreSQL ledger.
- [x] Install and lock dependencies; apply eight migrations and safe disabled-catalog seed.

## Visual direction and marketing
- [x] Violet editorial typography, real Lagos photography, warm-white/violet/deep-purple scenes.
- [x] Hero entrance, ambient float/rotation, marquee with pause, stacked scaling cards, pinned state story, travelling human footage, changing CTA, gift-card fan, referral connections and hover/press feedback. See MOTION.md.
- [x] Reduced motion, no-JavaScript content, offscreen loop controls, mobile still media, failure fallbacks and asset register.

## Application and backend
- [x] Authentication, email verification, configured Termii phone verification, password reset, browser sessions, mobile bearer, admin MFA/elevation and policy recording.
- [x] Customer dashboard, wallet, deposits/withdrawals, bill wizard and owned transactions/receipts.
- [x] Gift-card sell quotes, expiry, private evidence, quarantine, review and separate-operator settlement. Buying and broader exchanges stay unavailable pending supported providers.
- [x] Versioned structured referral rules, eligibility/caps/holdings, reward claims/reversals, admin persistence and audit.
- [x] Notifications, saved beneficiaries, support, profile/security and admin catalog/fee/limit/review/operations screens.
- [x] Immutable double-entry ledger, protected balances/transaction identity, atomic reservations, scoped idempotency, authenticated verification and durable jobs/reconciliation.

## Delivery and proof
- [x] Setup, OpenAPI/Swagger, architecture/ADRs, integration/operating guides and CI workflow.
- [x] Initial 28 database/API tests, lint, typecheck, dependency audit and both production builds; see latest follow-up results in VERIFICATION.md.
- [x] 13 browser tests against local production builds, requested viewport widths, motion/failure/brand checks and inspected screenshots.
- [x] Original brand-pack assets across headers, footer, sidebar, auth/admin screens, compact previews, favicons, home-screen icons and social metadata; source asset publication is reproducible.
- [x] Historical durable local worker-to-Mailpit delivery smoke test; replaced by Mailjet Send API v3.1 with mocked adapter checks. Real Mailjet delivery awaits user configuration.
- [x] Record external dependencies and exact verification limits.

## External and provider-dependent work still open
- [ ] Investigate the existing immediate reward-release assertion reproduced during brand follow-up (27/28 database/API tests passed); financial code was unchanged.
- [ ] Configure and verify actual Paystack, VTpass and Termii accounts and every enabled service; live operations remain disabled.
- [ ] Complete and verify a commercially approved gift-card supplier purchase/pricing/private-fulfillment adapter.
- [ ] Select and implement the approved identity/KYC provider and operating account tiers.
- [ ] Finalize operating/legal policies, gift-card liquidity/review arrangements, malware scanning, retention, statement/dispute reconciliation, monitoring, backup restoration and independent security review.
- [ ] Stage, load test, test real devices and verify production deployment before public launch.

This tracks local implementation, not production readiness. Detailed evidence is in VERIFICATION.md; the complete original brief is preserved in PRODUCT_REQUIREMENTS.md. Do not treat browser fixtures or local builds as live financial proof.
