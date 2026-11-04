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
    if (!process.env.API_ORIGIN && !process.env.API_HOSTPORT)
      throw new Error(
        "The web service needs API_ORIGIN or its Render API_HOSTPORT reference.",
      );
    return;
  }
  const e = env();
  if (!e.MAILJET_API_KEY || !e.MAILJET_SECRET_KEY || !e.MAILJET_FROM_EMAIL)
    throw new Error(
      "Configure MAILJET_API_KEY, MAILJET_SECRET_KEY and MAILJET_FROM_EMAIL before deploying.",
    );
  if (component === "api" && !e.UPLOAD_DIR.startsWith("/var/data/"))
    throw new Error(
      "Set UPLOAD_DIR to /var/data/evidence on the API's persistent disk.",
    );
  if (
    e.SMS_ENABLED === "true" &&
    (!e.TERMII_API_KEY || !e.TERMII_BASE_URL || !e.TERMII_SENDER_ID)
  )
    throw new Error(
      "SMS_ENABLED=true requires all Termii settings. Leave it false until configured.",
    );
}
