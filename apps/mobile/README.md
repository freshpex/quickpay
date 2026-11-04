# Quick Pay native app

Native Expo Router customer client of the existing Next.js `/api/v1` API. Uses the same users, sessions, PostgreSQL wallet journals, transactions and reward versions. There is no mobile backend or admin interface.

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm brand:sync:mobile
Copy-Item apps/mobile/.env.example apps/mobile/.env.local
pnpm db:migrate
pnpm dev
```

Edit the mobile `.env.local` before starting Metro. Use `http://10.0.2.2:3001/api/v1` on Android Emulator. On a physical device use your computer's reachable private LAN IPv4, e.g. `http://192.168.1.20:3001/api/v1`, and `EXPO_PUBLIC_SITE_URL=http://192.168.1.20:3000`. These are examples, not hosted services. Keep the phone/computer on the same network; allow your development server ports through your private-network firewall. Do not expose PostgreSQL. `localhost` on a phone points to the phone. iOS Simulator on the same Mac can use `http://127.0.0.1:3001/api/v1`.

In another terminal:

```powershell
pnpm mobile:android
# Subsequent launches, with the development build installed:
pnpm mobile:dev
```

Android requires Android Studio/SDK, an emulator or USB device and a compatible JDK. `expo run:android` generates the ignored native project and builds/installs locally. On macOS with Xcode and CocoaPods use `pnpm mobile:ios`. Native modules require a development build; Expo Go is not the delivery target. Change public environment variables and restart Metro with `--clear` when changing environments. A release/preview bundle requires HTTPS and rejects LAN HTTP even if the app is installed on a development phone. TLS verification stays enabled.

`pnpm dev` runs web, API and worker. The worker is required for verification/reset emails, payment initiation, reconciliation, rewards and push jobs. Mailjet settings belong only in the root server `.env`. Mobile `.env.local` must contain public URLs/project configuration only.

## Checks

```powershell
pnpm lint
pnpm typecheck
pnpm mobile:typecheck
pnpm test
pnpm --filter @quickpay/mobile exec expo install --check
pnpm mobile:doctor
pnpm mobile:export
```

Export checks JavaScript/native bundle compilation; it is not evidence that a native binary was built or exercised. See `docs/VERIFICATION.md` for actual evidence. Native smoke-test steps are in `docs/mobile/TESTING.md`.

## Build profiles and identifiers

`eas.json` provides development (dev client), preview (internal APK / signed iOS distribution), and production profiles. `com.example.quickpay.dev` and `quickpay-dev://` are documented development identifiers. No business domain ownership is asserted. Before production set confirmed `APP_IOS_BUNDLE_ID`, `APP_ANDROID_PACKAGE`, HTTPS API/site origins and your own EAS project UUID. The production config refuses the example identifiers. iOS internal distribution needs registered devices and Apple provisioning; iOS simulator builds need a simulator profile added when needed. App Store and Play Store signing/accounts/privacy declarations are external prerequisites.

After signing in to your own EAS account and linking a project, you can run these yourself:

```powershell
pnpm --filter @quickpay/mobile exec eas build --profile development --platform android
pnpm --filter @quickpay/mobile exec eas build --profile preview --platform all
pnpm --filter @quickpay/mobile exec eas build --profile production --platform all
```

Install EAS CLI separately (`pnpm dlx eas-cli@latest …`) if it is not on PATH. These commands upload source/build artifacts to Expo and were not run automatically. Nothing is submitted to stores. Do not use production credentials in local sample files.

## Security and financial behavior

Bearer sessions use Better Auth's existing plugin. The official Expo client handles MFA challenge cookies in SecureStore; API calls use the signed `set-auth-token` header, never a token in a URL. SecureStore uses device-only unlocked keychain accessibility. There is no AsyncStorage or password/PIN persistence. Get-session renewals are coordinated; a revoked/expired session clears private queries and secure drafts. Offline session restoration offers reconnect without deleting credentials on a transport failure. Logout revokes server authentication and device registration before clearing local state.

Every money request persists its original body **without password**, operation kind and scoped idempotency key in SecureStore before submission. A duplicate tap cannot create a second operation. Interrupted requests are checked by owned idempotency-key lookup. Manual resubmission checks status first and keeps the same key/body; it asks for fresh password authorization. No financial request is queued for offline replay. Current transaction data is re-fetched on foreground and payment returns. Hosted checkout opens only the backend's HTTPS `checkout.paystack.com` URL. A browser return, notification, upload or closed sheet never marks a payment successful or credits a wallet.

Fees/limits/availability/plans/quotes/reward summaries come from the server. Kobo strings stay exact and are formatted with shared bigint utilities. Display dates use Africa/Lagos; backend timestamps stay UTC. Gift evidence uses the existing authenticated encrypted upload flow, has server-enforced size/signature/type checks and remains quarantined/private. The temporary selected file is deleted after upload/cancellation; only the private evidence identifier and server quote are retained in a secure draft. Quotes expire server-side. Card buying, identity/KYC and unsupported exchanges stay unavailable.

Brand assets are copied byte-for-byte by `scripts/sync-mobile-brand.ts`: mobile header lockups, compact marks, Apple opaque/dark icons and Android launcher/adaptive/monochrome artwork. See the source README and `docs/ASSETS.md`. Do not add lettering beside full lockups.

See `docs/MOBILE_CAPABILITIES.md`, `docs/mobile/LINKS_AND_PUSH.md` and `docs/mobile/TESTING.md` for API mapping and remaining setup.
