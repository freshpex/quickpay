import type { ExpoConfig } from "expo/config";
const production = process.env.APP_VARIANT === "production";
if (production || process.env.APP_VARIANT === "preview") {
  const api = new URL(process.env.EXPO_PUBLIC_API_URL || "");
  if (api.protocol !== "https:" || api.username || api.password || api.search || api.hash || api.pathname.replace(/\/$/, "") !== "/api/v1") throw new Error("Preview/production builds require EXPO_PUBLIC_API_URL to be the public HTTPS API URL ending in /api/v1.");
  const site = new URL(process.env.EXPO_PUBLIC_SITE_URL || "");
  if (site.protocol !== "https:" || site.username || site.password)
    throw new Error(
      "Preview/production builds require EXPO_PUBLIC_SITE_URL to be the public HTTPS website origin.",
    );
}
const host = process.env.APP_LINK_HOST?.trim();
const iosId = process.env.APP_IOS_BUNDLE_ID || "com.quickpay.dev";
const androidId = process.env.APP_ANDROID_PACKAGE || "com.quickpay.dev";
if (
  production &&
  (iosId.startsWith("com.example.") || androidId.startsWith("com.example."))
)
  throw new Error(
    "Set confirmed APP_IOS_BUNDLE_ID and APP_ANDROID_PACKAGE for production builds.",
  );
if (host && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host))
  throw new Error(
    "APP_LINK_HOST must be a verified hostname, without a protocol or path.",
  );
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
const config: ExpoConfig = {
  name: "Quick Pay",
  slug: "quick-pay-mobile",
  version: "1.0.0",
  scheme: "quickpay-dev",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/brand/apple-icon.png",
  ios: {
    bundleIdentifier: iosId,
    supportsTablet: false,
    icon: {
      light: "./assets/brand/apple-icon.png",
      dark: "./assets/brand/apple-dark.png",
    },
    ...(host ? { associatedDomains: [`applinks:${host}`] } : {}),
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: androidId,
    icon: "./assets/brand/android-icon.png",
    adaptiveIcon: {
      foregroundImage: "./assets/brand/android-foreground.png",
      backgroundColor: "#6D28D9",
      monochromeImage: "./assets/brand/android-monochrome.png",
    },
    ...(host
      ? {
          intentFilters: [
            {
              action: "VIEW",
              autoVerify: true,
              category: ["BROWSABLE", "DEFAULT"],
              data: [
                "/mobile",
                "/reset-password",
                "/sign-in",
                "/sign-up",
                "/api/v1/auth/verify-email",
                "/api/v1/auth/reset-password/",
              ].map((pathPrefix) => ({ scheme: "https", host, pathPrefix })),
            },
          ],
        }
      : {}),
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications",
    [
      "expo-splash-screen",
      {
        image: "./assets/brand/symbol-white.png",
        imageWidth: 100,
        backgroundColor: "#2E1065",
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    ...(projectId ? { eas: { projectId } } : {}),
    linkHost: host || null,
  },
};
export default config;
