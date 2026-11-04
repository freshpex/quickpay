# Native links and push setup

Development links are strictly parsed by `services/deep-links/validate.ts`. Supported examples:

```
quickpay-dev://transaction?id=<transaction-uuid>
quickpay-dev://payment-return?id=<transaction-uuid>
quickpay-dev://referral?code=<referral-code>
quickpay-dev://verify?token=<one-time-verification-token>
quickpay-dev://reset-password?token=<one-time-reset-token>
```

Reset/verification tokens are one-time auth challenges already required by the backend, never session credentials. They are held only while consuming the flow and removed from route parameters after success. No session tokens/passwords/PINs are put into links. Unsupported hosts/routes, arbitrary redirect destinations, malformed UUIDs and insecure web URLs are rejected. A payment link ignores success flags and fetches the owned transaction. A transaction opened while signed out is retained only as a validated in-memory ID until sign-in.

The backend's existing verification/reset email URLs continue to work in the website. When the real website host is verified for app links, the native parser also supports the existing `/api/v1/auth/verify-email`, `/api/v1/auth/reset-password/<token>`, `/reset-password?token=…`, `/sign-in?verified=1` and referral `/sign-up?ref=…` forms. Returning from browser verification and signing in is supported without link association.

Set `APP_LINK_HOST` to a confirmed host, without protocol/path. Native configuration adds only explicit supported path prefixes. This alone does **not** verify domain ownership. Serve your own HTTPS `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` on that domain with the final Apple Team ID/bundle ID and Android package/signing SHA-256 certificate fingerprints. Include production and internal signing identities intentionally; never publish invented IDs/fingerprints. Configure equivalent iOS path associations for the supported paths. Verify on installed devices with Apple/Android association tools and email links. The development custom scheme must be replaced consistently across app configuration, native parser and the backend trusted origin before a final scheme is selected. Do not add broad wildcard trusted origins.

## Push

In-app updates already exist and continue independently of push. Added endpoints:

- GET/PATCH `/api/v1/notifications/preferences`: `{pushAvailable,pushEnabled}`; PATCH `{pushEnabled:boolean}`. Inbox cannot be disabled.
- POST `/api/v1/notifications/devices`: `{installationId:uuid,token:ExpoPushToken,platform:"ios"|"android"}`. Authenticated account owns the binding; a device signing into another account rebinds its token.
- DELETE same endpoint: `{installationId}` removes only an owned installation. Logout revokes the current registration.

Migration `0010_mobile_notifications.sql` stores encrypted tokens and adds a transactional outbox trigger on existing inbox notifications. The existing worker queues each device separately, sends a generic “new update” payload with notification ID only, checks Expo receipts after 15 minutes and removes DeviceNotRegistered bindings. Retries use existing durable jobs; duplicate delivery after an unknown transport result is possible and has no financial effect. Tickets/receipts are provider acknowledgements, not proof a person received/read a notification. No financial or gift-card details are included in lock-screen payloads. Token bindings expire from delivery eligibility after 90 days without refresh.

To enable, create/link your own EAS project; configure APNs and FCM v1 credentials using Expo's [official setup](https://docs.expo.dev/push-notifications/push-notifications-setup/). Enable enhanced push security for that project and configure the server-only `EXPO_ACCESS_TOKEN`. Set `EXPO_PUBLIC_EAS_PROJECT_ID` in the mobile build. Then set server `PUSH_ENABLED=true` for API and worker together; Render references the API values. Initial defaults stay false. No credentials were created or production configuration changed by this implementation.

Permissions are requested only from the user's Enable push action. Previously granted registrations refresh on sign-in/foreground; denied device permissions revoke the current binding. App notification taps open the inbox and fetch authenticated state. Push requires a physical installed development/preview/production build. Test both platforms with the real project credentials before enabling for customers.

References checked: [Better Auth Expo](https://better-auth.com/docs/integrations/expo), [Expo notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [Expo push delivery and receipts](https://docs.expo.dev/push-notifications/sending-notifications/), [Paystack hosted checkout](https://paystack.com/docs/payments/accept-payments/).
