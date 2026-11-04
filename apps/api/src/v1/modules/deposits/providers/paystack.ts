import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../../../../shared/infrastructure/env";
import { assert } from "../../../../shared/errors";
export function paystackConfigured() {
  return env().PAYMENT_MODE !== "disabled" && !!env().PAYSTACK_SECRET_KEY;
}
export async function paystack<T extends z.ZodType>(
  path: string,
  schema: T,
  payload?: unknown,
): Promise<z.infer<T>> {
  assert(
    paystackConfigured(),
    "PAYMENTS_UNAVAILABLE",
    "Adding money is not available yet. Please check back.",
    503,
  );
  const r = await fetch(`https://api.paystack.co/${path}`, {
    method: payload ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${env().PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  assert(
    r.ok,
    "PAYMENT_PENDING",
    "We could not confirm this request. Check its status before trying again.",
    503,
  );
  const data = z
    .object({ status: z.boolean(), data: z.unknown() })
    .parse(await r.json());
  assert(
    data.status,
    "PROVIDER_PENDING",
    "We could not confirm this request yet.",
    503,
  );
  return schema.parse(data.data);
}
export function validPaystackSignature(
  raw: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !/^[a-fA-F0-9]{128}$/.test(signature)) return false;
  const expected = createHmac("sha512", secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export const verifiedDepositSchema = z.object({
  id: z.number(),
  reference: z.string(),
  status: z.string(),
  amount: z.number().int().positive(),
  currency: z.string(),
  customer: z.object({ email: z.string() }),
  metadata: z.unknown().optional(),
});
export const verifiedTransferSchema = z.object({
  reference: z.string(),
  status: z.string(),
  amount: z.number().int().positive(),
  currency: z.string(),
  recipient: z.object({ recipient_code: z.string() }),
});
