import { pool } from "@quickpay/database";
import { z } from "zod";
import { env } from "../../../../shared/infrastructure/env";
import { assert } from "../../../../shared/errors";
import { paystack } from "../providers/paystack";
import type { PaymentRow } from "../../payments/repositories/payment.repository";

export async function prepareDepositCheckout(id: string) {
  // A persisted lease works with pooled database connections and expires after a crash.
  const token = crypto.randomUUID();
  const {
    rows: [p],
  } = await pool.query<PaymentRow>(
    "UPDATE transactions SET details=details||jsonb_build_object('checkoutLeaseToken',$2::text,'checkoutLeaseUntil',now()+interval '60 seconds') WHERE id=$1 AND kind='deposit' AND status='processing' AND NOT(details ? 'checkoutUrl') AND (NOT(details ? 'checkoutLeaseUntil') OR (details->>'checkoutLeaseUntil')::timestamptz<now()) RETURNING *",
    [id, token],
  );
  if (!p) return;
  const heartbeat = setInterval(() => {
    void pool
      .query(
        "UPDATE transactions SET details=jsonb_set(details,'{checkoutLeaseUntil}',to_jsonb(now()+interval '60 seconds')) WHERE id=$1 AND details->>'checkoutLeaseToken'=$2",
        [id, token],
      )
      .catch(() => {});
  }, 20000);
  try {
    const {
      rows: [u],
    } = await pool.query("SELECT email FROM users WHERE id=$1", [p.user_id]);
    const data = await paystack(
      "transaction/initialize",
      z.object({
        authorization_url: z.url(),
        access_code: z.string(),
        reference: z.string(),
      }),
      {
        email: u.email,
        amount: p.amount,
        currency: "NGN",
        reference: p.reference,
        callback_url: `${env().WEB_ORIGIN}/transactions/detail?id=${encodeURIComponent(p.id)}`,
        metadata: { transactionId: p.id },
      },
    );
    const url = new URL(data.authorization_url);
    assert(
      data.reference === p.reference,
      "REFERENCE_MISMATCH",
      "This checkout needs a further check.",
      409,
    );
    assert(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        url.hostname === "checkout.paystack.com",
      "CHECKOUT_INVALID",
      "Checkout is not available yet.",
      503,
    );
    // A webhook may already have confirmed the charge while initialization was in flight.
    await pool.query(
      "UPDATE transactions SET status=CASE WHEN status='processing' THEN 'awaiting_authorization' ELSE status END,details=details||$2::jsonb,updated_at=now() WHERE id=$1 AND kind='deposit'",
      [id, JSON.stringify({ checkoutUrl: url.href })],
    );
  } finally {
    clearInterval(heartbeat);
    await pool.query(
      "UPDATE transactions SET details=details-'checkoutLeaseToken'-'checkoutLeaseUntil' WHERE id=$1 AND details->>'checkoutLeaseToken'=$2",
      [id, token],
    );
  }
}
