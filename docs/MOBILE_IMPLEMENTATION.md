# Mobile implementation checklist

- [x] Inspect repository, customer flows, API, bearer authentication, shared packages and original brand pack; map endpoints and gaps.
- [ ] Verify official Expo / NativeWind compatibility and install locked workspace dependencies.
- [ ] Native theme, original icon/header synchronization, navigation, accessible controls, motion and safe areas.
- [ ] Secure sessions, signup/verification/recovery, lifecycle refresh, logout cleanup and validated deep links.
- [ ] Dashboard, wallet capabilities, deposit/withdrawal review, idempotent recovery and accurate status/receipt screens.
- [ ] Backend-driven bill categories, plans, beneficiary validation and saved recipients.
- [ ] Private gift-card evidence/quotes/sales, exchange availability and referral activity/claims/share.
- [ ] Profile, password/phone security, notifications/preferences/device registration and support journeys.
- [ ] Focused backend additions, ownership tests and OpenAPI updates.
- [ ] Unit/integration tests, lint/typecheck, Expo doctor, native bundles, available native build/device inspection.
- [ ] Environment/device/EAS/signing/deep-link/push documentation and honest verification evidence.

Dependency decision: Expo SDK 57 with React Native 0.86.3 and React 19.2.3, the stable SDK explicitly supported by NativeWind 4.2.7. Expo SDK 58 exists, but NativeWind's stable installation documentation currently specifies SDK 57 compatibility. Keep mobile React isolated from the Next.js apps. NativeWind uses its own Tailwind 3 configuration; website Tailwind 4 is unchanged.

Official references checked: [Expo monorepos](https://docs.expo.dev/guides/monorepos/), [NativeWind installation](https://www.nativewind.dev/docs/getting-started/installation), [Better Auth bearer](https://better-auth.com/docs/plugins/bearer), [Expo Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/). Use `expo install` against SDK 57 to resolve native library versions rather than copying latest-SDK versions.
