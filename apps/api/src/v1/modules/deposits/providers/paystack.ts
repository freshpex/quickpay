import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../../../../shared/infrastructure/env";
import { assert, DomainError } from "../../../../shared/errors";
export function paystackConfigured() {
  return env().PAYMENT_MODE !== "disabled" && !!env().PAYSTACK_SECRET_KEY;
}
export function withdrawalsConfigured() {
  return (
    paystackConfigured() &&
    (env().PAYMENT_MODE === "sandbox" ||
      env().PAYSTACK_TRANSFERS_ENABLED === "true")
  );
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
  const accountLookup = path.startsWith("bank/resolve"),
    bankList = path.startsWith("bank?");
  const unavailable = () =>
    new DomainError(
      accountLookup
        ? "BANK_LOOKUP_UNAVAILABLE"
        : bankList
          ? "BANK_LIST_UNAVAILABLE"
          : "PAYMENT_PENDING",
      accountLookup
        ? "Account verification is temporarily unavailable. Please try again shortly. No transfer has been made."
        : bankList
          ? "We could not load the banks. Please try again shortly."
          : "We could not confirm this request. Check its status before trying again.",
      503,
    );
  // Bank reads can be retried safely. Money-moving requests reconcile uncertain outcomes instead.
  let r: Response | undefined;
  for (
    let attempt = 0;
    attempt < (accountLookup || bankList ? 2 : 1);
    attempt++
  ) {
    try {
      r = await fetch(`https://api.paystack.co/${path}`, {
        method: payload ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${env().PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(accountLookup || bankList ? 10000 : 20000),
      });
      if (r.ok || (r.status < 500 && ![408, 425, 429].includes(r.status)))
        break;
    } catch {
      r = undefined;
    }
  }
  if (!r) throw unavailable();
  if (
    !r.ok &&
    r.status >= 400 &&
    r.status < 500 &&
    ![408, 409, 425, 429].includes(r.status)
  ) {
    assert(
      false,
      accountLookup
        ? [401, 403].includes(r.status)
          ? "BANK_LOOKUP_UNAVAILABLE"
          : "BANK_ACCOUNT_UNVERIFIED"
        : bankList
          ? "BANK_LIST_UNAVAILABLE"
          : "PROVIDER_REJECTED",
      accountLookup
        ? "Paystack could not verify this account. Check the selected bank and ten-digit account number, or try again shortly. No transfer has been made."
        : bankList
          ? "We could not load the banks. Please try again shortly."
          : "The payment provider could not accept this request. Please contact support if it continues.",
      (accountLookup && [401, 403].includes(r.status)) || bankList ? 503 : 422,
    );
  }
  if (!r.ok) throw unavailable();
  const raw = await r.json().catch(() => {
    throw unavailable();
  });
  const data = z
    .object({ status: z.boolean(), data: z.unknown().optional() })
    .safeParse(raw);
  if (!data.success) throw unavailable();
  assert(
    data.data.status,
    accountLookup
      ? "BANK_ACCOUNT_UNVERIFIED"
      : bankList
        ? "BANK_LIST_UNAVAILABLE"
        : "PROVIDER_PENDING",
    accountLookup
      ? "Paystack could not verify this account. Check the selected bank and ten-digit account number, or try again shortly. No transfer has been made."
      : bankList
        ? "We could not load the banks. Please try again shortly."
        : "We could not confirm this request yet.",
    accountLookup ? 422 : 503,
  );
  const parsed = schema.safeParse(data.data.data);
  if (!parsed.success) throw unavailable();
  return parsed.data;
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

export const resolvedBankAccountSchema = z.object({
  account_number: z.string(),
  account_name: z.string().trim().min(1),
});
