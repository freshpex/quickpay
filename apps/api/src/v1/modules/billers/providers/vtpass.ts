import { z } from "zod";
import { env } from "../../../../shared/infrastructure/env";
import { assert } from "../../../../shared/errors";
const envelope = z.object({
  code: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  response_description: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  content: z.unknown().optional(),
  requestId: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  amount: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((value) => value ?? undefined),
  purchased_code: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
});
export function vtpassConfigured() {
  const e = env();
  return (
    e.PAYMENT_MODE !== "disabled" &&
    !!e.VTPASS_API_KEY &&
    !!e.VTPASS_SECRET_KEY &&
    !!e.VTPASS_PUBLIC_KEY &&
    e.VTPASS_ENV === e.PAYMENT_MODE
  );
}
export async function vtpass(
  path: string,
  method: "GET" | "POST",
  payload?: unknown,
) {
  assert(
    vtpassConfigured(),
    "SERVICE_UNAVAILABLE",
    "This service is not available yet.",
    503,
  );
  const e = env();
  const r = await fetch(
    `https://${e.VTPASS_ENV === "sandbox" ? "sandbox." : ""}vtpass.com/api/${path}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        "api-key": e.VTPASS_API_KEY!,
        [method === "GET" ? "public-key" : "secret-key"]:
          method === "GET" ? e.VTPASS_PUBLIC_KEY! : e.VTPASS_SECRET_KEY!,
      },
      body: method === "POST" ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(20000),
    },
  );
  assert(
    r.ok,
    "SERVICE_PENDING",
    "We could not check this service. Please try again later.",
    503,
  );
  return envelope.parse(await r.json());
}
export function vtReference() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const p = (t: string) => parts.find((v) => v.type === t)!.value;
  return `${p("year")}${p("month")}${p("day")}${p("hour")}${p("minute")}${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}
export const variationSchema = z.object({
  ServiceName: z.string().optional(),
  variations: z.array(
    z.object({
      variation_code: z.string(),
      name: z.string(),
      variation_amount: z.union([z.string(), z.number()]),
      fixedPrice: z.string().optional(),
    }),
  ),
});
