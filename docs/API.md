# HTTP API guide

Base URL: `/api/v1`. Machine-readable reference: `/api/v1/openapi`; Swagger viewer: API app `/docs`.

Use JSON and bearer sessions for mobile; browser calls use HttpOnly SameSite cookies through the same-origin web rewrite. Browser mutations need a matching Origin. Auth responses use Better Auth’s documented JSON/session conventions; sign-in may return `twoFactorRedirect`. Store mobile session tokens only in secure OS storage. Logout revokes the session. No core operation requires a React component or Server Action.

Money is an integer-kobo string, e.g. `"150000"` means ₦1,500.00. Timestamps are ISO UTC. Financial POSTs require an `Idempotency-Key` of 16–100 safe characters, scoped to the user. Retrying an identical body returns the original transaction; changing details with the same key gives 409. A payment password is authorization, excluded from the persisted request hash and transaction details.

## Native additions

The native app reuses these APIs and the existing bearer plugin. Better Auth's official Expo plugin additionally manages MFA challenge cookies and a narrowly trusted `quickpay-dev://` development origin; browser cookie attributes, origin checks, verification and permissions stay enforced. The client reads signed `set-auth-token` response headers and stores credentials in OS secure storage. There is no refresh-token endpoint; coordinated get-session requests use the existing sliding session policy.

- GET `/wallet/capabilities` (authenticated): `{currency,deposit,withdrawal}`. Each capability includes `available`, `minimum`, `maximum`, `fee` (kobo strings) and `reason`; deposits include available `methods`. Limits are shared with existing command validation, with unchanged values/financial behavior.
- GET `/payments/by-key/{key}` (authenticated): `{transaction:Transaction|null}` for the caller's idempotency key. An absent key and another account's key both return null. This is a read-only recovery lookup; it never creates/replays a payment.
- GET/PATCH `/notifications/preferences`: current push availability/account preference; PATCH `{pushEnabled:boolean}`. In-app notifications stay enabled. Unconfigured push cannot be enabled.
- POST `/notifications/devices`: `{installationId:uuid,token,platform:"ios"|"android"}`. Token is validated and encrypted; binding follows the authenticated user. DELETE with `{installationId}` revokes only an owned binding.

Gift evidence accepts native multipart requests with or without Content-Length. It bounds the actual stream to 5,245,000 bytes before parsing and retains the existing 5 MiB JPG/PNG MIME/signature checks, private encryption, ownership and quarantine.

See [mobile capability map](MOBILE_CAPABILITIES.md) and [push/link setup](mobile/LINKS_AND_PUSH.md). Notifications queue generic push jobs through the existing durable worker and do not alter payment settlement or referral rules.

## Primary flows

| Flow           | Requests and result                                                                                                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup         | POST `/auth/sign-up/email`: name, email, Nigerian phoneNumber, password, confirmPassword, optional referralCode, terms=true. Server records policy version/time; queues verification.                                                                |
| Verify/reset   | GET signed `/auth/verify-email` link; POST `/auth/request-password-reset` and `/auth/reset-password`. New passwords meet the shared requirements.                                                                                                    |
| Wallet         | GET `/wallet`: available, reserved, rewards, reward_debt, debt and currency.                                                                                                                                                                         |
| Deposit        | POST `/deposits` with amount + idempotency. Returns transaction; poll owned `/payments/{id}` until checkoutUrl appears, then open hosted checkout. Redirect alone does not credit funds.                                                             |
| Withdrawal     | GET `/banks`; POST `/banks/resolve` with bankCode/accountNumber; POST `/withdrawals` with amount, the same destination, validationId, password + idempotency. Destination checks expire after ten minutes.                                           |
| Bill           | GET `/catalog`; GET `/catalog/{serviceId}/plans`; POST `/billers/validate` where required; POST `/payments` with serviceId, beneficiary, amount, optional plan/phone/validationId, password + idempotency. Current fixed-plan amounts are rechecked. |
| Status/receipt | GET `/payments` with optional `before` ISO cursor; GET `/payments/{id}`; POST `/payments/{id}/check`. Only owned resources are returned. Receipt fulfillment appears only after verified success.                                                    |
| Gifts          | GET `/gift-cards/products`; POST `/gift-cards/quotes` with productId/whole units; multipart POST `/gift-cards/evidence`; POST `/gift-cards/sales` with quoteId/evidenceId; GET sales. No credit on upload. Buying is unavailable.                    |
| Rewards        | GET `/rewards/active-rule`, GET `/referrals`; POST `/rewards/{id}/claim` with password. Claim is idempotent by reward identity and uses the original rule.                                                                                           |
| Support        | GET/POST `/support`: subject, message, optional owned transactionId. Notifications are GET/PATCH `/notifications`.                                                                                                                                   |
| Profile        | GET/PATCH `/profile`; POST `/auth/change-password`; MFA enable/verify through Better Auth. GET/POST/DELETE `/beneficiaries` is ownership scoped.                                                                                                     |

## Admin permissions and mutations

All admin data endpoints require verified admin identity, relevant explicit permission, TOTP enabled and an unexpired session elevation. GET `/admin/access` describes the unlock state; POST `/admin/unlock` verifies an authenticator code for 15 minutes. Customer client state cannot grant access.

| Resource      | Read permission   | Mutation body / permission                                                                                                |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| users         | users.read        | id, referralHold, reason / users.write                                                                                    |
| transactions  | transactions.read | id, reason; queues provider reconciliation / operations.write                                                             |
| catalog       | catalog.read      | id, enabled, fee, min, max, reason / catalog.write; money is kobo                                                         |
| gift-products | gift.configure    | id, enabled, sellEnabled, rateKobo, minUnits, maxUnits, reason / gift.configure                                           |
| gifts         | gift.review       | id, action(clean/approve/reject/settle), reason, optional settlementReference / evidence.scan, gift.review or gift.settle |
| reward-rules  | rewards.read      | validated RewardRule / rewards.write; POST appends immutable version                                                      |
| support       | support.read      | id, response, status(open/resolved) / support.write                                                                       |
| operations    | operations.read   | id, reason; retries failed job / operations.write                                                                         |
| audit         | audit.read        | append-only, no public mutation                                                                                           |
| exchanges     | exchanges.read    | no unsupported provider pair can be enabled                                                                               |

## Errors and states

Application errors are `{error:{code,message,fields?,correlationId}}` with safe customer wording. Auth endpoints may return Better Auth `{code,message}` errors, normalized by the API client. 401 means sign in; 403 means insufficient permission/verification/elevation; 409 means a state or idempotency conflict; 422 identifies invalid fields; 429 requires waiting; 503 indicates unavailable or uncertain provider work.

Transactions model created, awaiting_authorization, processing, successful, failed, reversed and cancelled. A provider timeout remains processing. Reversed is a compensating outcome, including a release when the provider reversed before settlement. Never infer money movement from a browser fixture or a pending API response.
