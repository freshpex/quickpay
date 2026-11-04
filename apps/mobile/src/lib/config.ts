export function validateApiUrl(
  value: string | undefined,
  development: boolean,
) {
  if (!value)
    throw new Error(
      "Set EXPO_PUBLIC_API_URL in apps/mobile/.env.local, then restart Metro.",
    );
  const url = new URL(value);
  const local =
    /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
      url.hostname,
    );
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/$/, "") !== "/api/v1" ||
    (url.protocol !== "https:" &&
      !(development && local && url.protocol === "http:"))
  )
    throw new Error(
      "Use an HTTPS API URL ending in /api/v1. Local HTTP is allowed only in a development build on a private network.",
    );
  return value.replace(/\/$/, "");
}
export const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;
export const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;
export const storageScope = `quickpay_${(rawApiUrl || "unconfigured").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
