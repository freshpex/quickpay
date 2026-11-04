import { z } from "zod";
import { env } from "../../../../shared/infrastructure/env";
import { assert } from "../../../../shared/errors";
export function smsConfigured() {
  const e = env();
  return (
    e.SMS_ENABLED === "true" &&
    !!e.TERMII_API_KEY &&
    !!e.TERMII_BASE_URL &&
    !!e.TERMII_SENDER_ID
  );
}
async function termii(path: string, payload: unknown) {
  assert(
    smsConfigured(),
    "SMS_UNAVAILABLE",
    "Phone verification is not available yet. Please check back.",
    503,
  );
  const e = env(),
    base = new URL(e.TERMII_BASE_URL!);
  assert(
    base.protocol === "https:" &&
      (base.hostname === "termii.com" || base.hostname.endsWith(".termii.com")),
    "SMS_CONFIG",
    "Phone verification is not available yet.",
    503,
  );
  const response = await fetch(`${base.origin}/api/sms/otp/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: e.TERMII_API_KEY, ...(payload as object) }),
    signal: AbortSignal.timeout(15000),
  });
  assert(
    response.ok,
    "SMS_RETRY",
    "We could not check your phone right now. Please try again.",
    503,
  );
  return response.json();
}
export async function sendPhoneCode(number: string) {
  const value = z
    .object({ pinId: z.string().optional(), pin_id: z.string().optional() })
    .parse(
      await termii("send", {
        message_type: "NUMERIC",
        pin_type: "NUMERIC",
        to: number.replace("+", ""),
        from: env().TERMII_SENDER_ID,
        channel: "generic",
        pin_attempts: 3,
        pin_time_to_live: 5,
        pin_length: 6,
        pin_placeholder: "<123456>",
        message_text:
          "Your Quick Pay verification code is <123456>. Do not share it.",
      }),
    );
  const reference = value.pinId || value.pin_id;
  assert(
    reference,
    "SMS_RETRY",
    "We could not send a code. Please try again.",
    503,
  );
  return reference;
}
export async function verifyPhoneCode(
  reference: string,
  code: string,
  number: string,
) {
  const result = z
    .object({
      pinId: z.string(),
      verified: z.union([z.boolean(), z.string()]),
      msisdn: z.string(),
    })
    .parse(await termii("verify", { pin_id: reference, pin: code }));
  return (
    result.pinId === reference &&
    (result.verified === true || result.verified === "True") &&
    result.msisdn.replace("+", "") === number.replace("+", "")
  );
}
