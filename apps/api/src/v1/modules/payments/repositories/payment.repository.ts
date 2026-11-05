import { pool, type Connection } from "@quickpay/database";
import { assert } from "../../../../shared/errors";
export type PaymentRow = {
  id: string;
  user_id: string;
  kind: string;
  status: import("@quickpay/contracts").PaymentState;
  amount: string;
  fee: string;
  currency: string;
  reference: string;
  provider: string;
  provider_reference: string | null;
  service_id: string | null;
  details: Record<string, unknown>;
  created_at: Date;
  request_hash: string;
};
export const publicTransaction = (r: PaymentRow) => ({
  id: r.id,
  userId: r.user_id,
  kind: r.kind,
  status: r.status,
  amount: r.amount,
  fee: r.fee,
  currency: r.currency,
  reference: r.reference,
  serviceId: r.service_id,
  createdAt: r.created_at,
  details: Object.fromEntries(
    Object.entries(r.details).filter(
      ([k]) =>
        ![
          "recipientCode",
          "encryptedDestination",
          "providerRaw",
          "initiationStarted",
          "attemptedAt",
          "checkoutLeaseToken",
          "checkoutLeaseUntil",
        ].includes(k),
    ),
  ),
});
export async function ownPayment(id: string, userId: string) {
  const r = await pool.query<PaymentRow>(
    "SELECT * FROM transactions WHERE id=$1 AND user_id=$2",
    [id, userId],
  );
  assert(r.rowCount, "NOT_FOUND", "We could not find that payment.", 404);
  return r.rows[0];
}
export async function idempotent(
  c: Connection,
  userId: string,
  key: string,
  hash: string,
) {
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `${userId}:${key}`,
  ]);
  const r = await c.query<PaymentRow>(
    "SELECT * FROM transactions WHERE user_id=$1 AND idempotency_key=$2",
    [userId, key],
  );
  if (r.rowCount) {
    assert(
      r.rows[0].request_hash === hash,
      "IDEMPOTENCY_CONFLICT",
      "This request reference was already used for different details.",
      409,
    );
    return r.rows[0];
  }
  return null;
}
