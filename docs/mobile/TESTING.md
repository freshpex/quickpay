# Native verification checklist

Record actual runs and screenshots in `docs/VERIFICATION.md`, including device/model, OS, build variant and API environment. Browser/Expo web results do not count as native proof.

1. Run lint, root/mobile TypeScript, database/API/mobile unit tests, Expo dependency check/doctor and iOS/Android JavaScript export.
2. Generate native config with `pnpm --filter @quickpay/mobile exec expo prebuild --no-install`. Build Android with `pnpm mobile:android`. On macOS/Xcode run `pnpm mobile:ios`; inspect asset compilation, signing, safe areas and keyboard behavior.
3. Exercise small/large phones and increased system font size: signup field errors/confirm password, unchecked policy acceptance and working links, every password eye control, keyboard next/go and visible submit controls. Test TalkBack/VoiceOver labels, touch targets and reduced motion.
4. Create a disposable account on an isolated test API, verify email, sign in, background/restore, expire/revoke session, reset/change password, enable/verify MFA, logout and change account. Confirm private cached data/drafts are removed. No provider credentials may appear in the bundle/logs.
5. With approved sandbox providers: deposit checkout/cancel/return, bank validation expiry, insufficient funds, bill plan changes, electricity token, pending/failure/reversal, support with ownership errors. Terminate the app during submission; recover by original idempotency key. Double tap, disconnect mid-request and foreground. Check authoritative balances and immutable ledger tests; never infer provider verification from an animation.
6. Verify gift quote expiry, cancelled picker/upload, unsupported/oversized files, private quarantined evidence, review/rejection and independent settlement. Buying/unsupported exchange/KYC stay disabled.
7. Load multiple history pages, filter/search, open/share receipts, save/remove recipients, share referral invitations, inspect pending/earned/reversed rewards and claim only when the recorded rule permits.
8. On physical iOS/Android devices with APNs/FCM: opt in/out, deny permissions, token rotation/rebinding/logout revocation, generic lock-screen payload, cold/warm notification taps and provider receipts. Confirm inbox works when push is off.
9. Verify development scheme and real signed universal/app links; reject external hosts/open redirects/malformed IDs. Payment links and push taps must fetch current backend status.

Before store submission: final business identifiers and verified domain, signing accounts/certificates, EAS project, privacy/data-safety forms, approved legal/operating policies, real provider certification and commercial gift-card/KYC arrangements, malware scanning/retention, production observability/backups, physical-device accessibility/network/performance review. These are not established by bundle export or an emulator smoke test.
