import { env } from "../apps/api/src/shared/infrastructure/env";

export function checkDeployment(component: string) {
  if (!["web", "api", "worker"].includes(component))
    throw new Error("Choose web, api or worker.");
  const origin = new URL(process.env.WEB_ORIGIN || "");
  if (
    origin.protocol !== "https:" ||
    ["localhost", "127.0.0.1"].includes(origin.hostname)
  )
    throw new Error("Set WEB_ORIGIN to the final public HTTPS website URL.");
  if (component === "web") {
    const apiOrigin = process.env.API_ORIGIN;
    if (!apiOrigin || new URL(apiOrigin).protocol !== "https:")
      throw new Error(
        "Set API_ORIGIN to the API's public HTTPS URL. Free Render services cannot receive private network requests.",
      );
    return;
  }
  const e = env();
  if (e.PUSH_ENABLED === "true" && !e.EXPO_ACCESS_TOKEN)
    throw new Error(
      "PUSH_ENABLED=true requires EXPO_ACCESS_TOKEN and configured APNs/FCM credentials. Leave push disabled until configured.",
    );
  if (!e.MAILJET_API_KEY || !e.MAILJET_SECRET_KEY || !e.MAILJET_FROM_EMAIL)
    throw new Error(
      "Configure MAILJET_API_KEY, MAILJET_SECRET_KEY and MAILJET_FROM_EMAIL before deploying.",
    );
  if (process.env.RENDER && e.UPLOAD_STORAGE !== "database")
    throw new Error(
      "Set UPLOAD_STORAGE=database on Render so private evidence survives restarts without a paid disk.",
    );
  if (
    e.SMS_ENABLED === "true" &&
    (!e.TERMII_API_KEY || !e.TERMII_BASE_URL || !e.TERMII_SENDER_ID)
  )
    throw new Error(
      "SMS_ENABLED=true requires all Termii settings. Leave it false until configured.",
    );
}
