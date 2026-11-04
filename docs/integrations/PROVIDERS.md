# Provider research and setup

Official documentation checked on 4 November 2026. No provider account or credential was supplied, and no sandbox/live financial result is claimed.

## Paystack: hosted collections and Nigerian bank payouts

Sources: [webhooks](https://paystack.com/docs/payments/webhooks/), [single transfers](https://paystack.com/docs/transfers/single-transfers/), [transaction verification](https://paystack.com/docs/payments/verify-payments/), [bank account verification](https://paystack.com/docs/identity-verification/verify-account-number/).

Implemented adapter calls: `transaction/initialize`, `transaction/verify/{reference}`, `bank?country=nigeria&currency=NGN`, `bank/resolve`, `transferrecipient`, `transfer`, `transfer/verify/{reference}`. API keys stay on the server. Collection uses hosted checkout; the browser never posts a wallet credit. Signed raw-body events are deduplicated and trigger independent API verification before ledger posting. Deposit verification matches reference, amount, NGN currency and account email. Transfers additionally match the persisted recipient code.

Configure `PAYMENT_MODE=sandbox` and `PAYSTACK_SECRET_KEY=sk_test_...`. Transfer availability additionally requires `PAYSTACK_TRANSFERS_ENABLED=true` after verifying account permissions, funded provider balance, payout settings and approved fee/limit policies. For live mode, use live keys and HTTPS webhook routing to `/api/v1/webhooks/paystack`. Never put the secret key in a `NEXT_PUBLIC_*` variable.

Record actual sandbox collection, duplicate webhook, transfer success/failure/reversal and timeout/reconciliation evidence before enabling live operations. Confirm account-specific transfer approval/OTP behavior. A timeout or provider error does not release funds automatically. Provider refusal before a final verifiable state remains an operational issue for reconciliation.

Paystack refund/dispute events and settlement statements need an operating runbook and provider-specific chargeback handling before launch. The ledger can compensate verified reversals and record chargeback debt; this does not claim that every Paystack dispute/refund event is automatically mapped. Current webhook reference extraction covers direct charge/transfer references. Staff must reconcile other event shapes against authenticated provider records. Do not credit or debit from an unsigned customer claim.

## VTpass: bills, airtime and data

Sources: [authentication](https://vtpass.com/documentation/authentication/), [request IDs](https://vtpass.com/documentation/how-to-generate-request-id/), [requery](https://vtpass.com/documentation/re-query-services/), [plans](https://vtpass.com/documentation/variation-codes/), [callbacks](https://vtpass.com/documentation/callback-api-integration/).

Implemented adapter calls: `service-variations`, `merchant-verify`, `pay` and `requery`. GET uses `api-key` plus `public-key`; POST uses `api-key` plus `secret-key`. Request IDs start with the current Lagos YYYYMMDDHHmm prefix. Calls use sandbox or live hosts explicitly. Exact whole-naira conversion occurs at the adapter boundary; wallet money remains kobo.

Configure the three VTpass keys and `VTPASS_ENV=sandbox`. Services start disabled. Confirm the actual service IDs, beneficiary request fields, plan requirements, limits, current fees and fulfillment output for each service in sandbox. Then enable each validated service through the admin catalog. The seed is a candidate inventory, not evidence that every listed product is supported by the current provider account. Catalog prices/plans are fetched from the provider for enabled services; the allowed service inventory remains explicitly curated.

The reviewed callback document did not supply a suitable cryptographic signature contract. Consequently no VTpass callback can directly finalize money. Scheduled, authenticated requery verifies reference, destination, amount and delivered/failed/reversed status. Confirm exact response field semantics with account-specific sandbox results. Electricity fulfillment is exposed only on the owned verified transaction receipt.

## Gift-card buying and resale

Evaluated [Reloadly Gift Cards API](https://docs.reloadly.com/gift-cards) and [official ordering guide](https://developers.reloadly.com/gift-cards/order-giftcard). Reloadly documents product-specific OAuth audiences, separate sandbox/live credentials and `https://giftcards.reloadly.com/orders` purchasing. This does **not** establish a resale capability or Quick Pay commercial access.

Buying remains disabled. The server-side purchase contract deliberately returns unavailable until a supplier adapter, immutable product-price snapshot, debit reservation, idempotent ordering, private code fulfillment and authenticated reconciliation are validated together. No purchase API is invented or advertised as live.

Resale uses an explicit internal review workflow: admin-configured supported brands/regions/card types and exact naira rates; immutable ten-minute quotes; private encrypted evidence; safety quarantine; verified value review; rejection reasons; and settlement by a different authorized administrator. Commercial liquidity, fraud checks and secure evidence scanning are business dependencies. Disabled seed rates are never presented as real market quotes.

## Identity and contact verification

Email verification/reset delivery uses Mailjet Send API v3.1 through the existing durable worker jobs. Fill these server-only settings in the worker's root `.env` (or deployment environment):

```dotenv
MAILJET_API_KEY=
MAILJET_SECRET_KEY=
MAILJET_FROM_EMAIL=
MAILJET_FROM_NAME=Quick Pay
```

The first three settings are intentionally blank. `MAILJET_FROM_EMAIL` is a bare email address, not `Name <address>`, and must be a verified active sender in the matching Mailjet account. Restart the worker after configuration changes. The adapter follows Mailjet's [Send API v3.1](https://dev.mailjet.com/docs/email-api/send-api-v31/send-basic-email) and [Basic authentication](https://dev.mailjet.com/docs/api-reference), checked 4 November 2026. It sends the existing job's subject and plain-text body to `https://api.mailjet.com/v3.1/send` with a 15-second timeout. Missing configuration, HTTP errors, invalid responses and per-message rejection throw rather than completing the job; existing durable retry/backoff behavior applies. API acceptance is distinct from delivered/bounced events. No Mailjet credentials, live sends or inbox-delivery proof are included. SMTP/Nodemailer and the Compose Mailpit service have been removed.

Phone normalization and a Termii OTP adapter are implemented. Configure SMS_ENABLED=true, TERMII_API_KEY, TERMII_BASE_URL (the account-specific HTTPS origin from the Termii dashboard) and TERMII_SENDER_ID. The adapter follows [Send Token](https://developers.termii.com/send-token) and [Verify Token](https://developers.termii.com/verify-token), checked 4 November 2026. Only an owned, unexpired, attempt-limited challenge can verify the stored phone. Provider references are encrypted; OTP values are not stored or logged. Actual delivery and account routing remain unverified without credentials. Number changes require a reviewed recovery process. No verification code is logged or automatically accepted.

Evaluated [Dojah identity verification](https://checkin.dojah.io/liveness-check) as an onboarding candidate. Do not collect NIN/BVN/biometrics or claim KYC completion until the operating entity selects a provider, defines permitted checks/consent/retention and supplies commercial access. A verified email/phone is not identity verification. Operating eligibility, account tiers and KYC thresholds must be established before enabling live wallet operations.

Termii configuration clarification: `TERMII_API_KEY` is the authentication secret shown on the API keys page. `TERMII_BASE_URL` is the API origin, not another credential; Termii's introduction documents account/regional routing, so confirm the applicable endpoint rather than guessing it from the dashboard URL. `TERMII_SENDER_ID` is the approved name/number used in the OTP request's required `from` field. It is managed separately from API keys: the official [Sender ID API](https://developers.termii.com/sender-id) lists registered senders and their active/pending status. Do not assume `QuickPay` is approved. The authenticated dashboard was not accessible during this check; these requirements were verified against public official documentation.
