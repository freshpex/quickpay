import "dotenv/config";
import { z } from "zod";
import { ConfigurationError } from "../errors";
const schema = z.object({
  DATABASE_URL: z.url(),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  API_ORIGIN: z.url().default("http://localhost:3001"),
  BETTER_AUTH_SECRET: z.string().min(32),
  DATA_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  PAYMENT_MODE: z.enum(["disabled", "sandbox", "live"]).default("disabled"),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_TRANSFERS_ENABLED: z.enum(["true", "false"]).default("false"),
  VTPASS_API_KEY: z.string().optional(),
  VTPASS_SECRET_KEY: z.string().optional(),
  VTPASS_PUBLIC_KEY: z.string().optional(),
  VTPASS_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  MAILJET_API_KEY: z.string().trim().default(""),
  MAILJET_SECRET_KEY: z.string().trim().default(""),
  MAILJET_FROM_EMAIL: z.union([z.email(), z.literal("")]).default(""),
  MAILJET_FROM_NAME: z.string().trim().default("Quick Pay"),
  UPLOAD_DIR: z.string().default(".local/evidence"),
  SMS_ENABLED: z.enum(["true", "false"]).default("false"),
  PUSH_ENABLED: z.enum(["true", "false"]).default("false"),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  TERMII_API_KEY: z.string().optional(),
  TERMII_BASE_URL: z.string().optional(),
  TERMII_SENDER_ID: z.string().optional(),
});
let cached: z.infer<typeof schema> | undefined;
export function env() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new ConfigurationError([
        ...new Set(parsed.error.issues.map((issue) => String(issue.path[0]))),
      ]);
    }
    const config = parsed.data;
    if (
      config.PAYMENT_MODE === "live" &&
      ((config.PAYSTACK_SECRET_KEY &&
        !config.PAYSTACK_SECRET_KEY.startsWith("sk_live_")) ||
        (config.VTPASS_API_KEY && config.VTPASS_ENV !== "live"))
    )
      throw new ConfigurationError([
        "PAYMENT_MODE",
        "PAYSTACK_SECRET_KEY",
        "VTPASS_ENV",
      ]);
    if (
      config.PAYMENT_MODE === "sandbox" &&
      config.PAYSTACK_SECRET_KEY &&
      !config.PAYSTACK_SECRET_KEY.startsWith("sk_test_")
    )
      throw new ConfigurationError(["PAYMENT_MODE", "PAYSTACK_SECRET_KEY"]);
    cached = config;
  }
  return cached;
}
