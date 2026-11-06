import { pool, enqueue } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { json, rateLimit } from "../../../../shared/infrastructure/http";
import {
  ownPayment,
  publicTransaction,
  type PaymentRow,
} from "../repositories/payment.repository";
export async function listPayments(req: Request) {
  const s = await identity(req);
  const cursor = new URL(req.url).searchParams.get("before");
  const r = await pool.query<PaymentRow>(
    "SELECT * FROM transactions WHERE user_id=$1 AND ($2::timestamptz IS NULL OR created_at<$2) ORDER BY created_at DESC LIMIT 51",
    [s.user.id, cursor],
  );
  return json({
    transactions: r.rows.slice(0, 50).map(publicTransaction),
    nextCursor: r.rows.length > 50 ? r.rows[49].created_at : null,
  });
}
export async function getPayment(req: Request, id: string) {
  const s = await identity(req);
  const payment = await ownPayment(id, s.user.id);
  if (
    payment.kind === "deposit"
      ? ["failed", "cancelled"].includes(payment.status) ||
        (["processing", "awaiting_authorization"].includes(payment.status) &&
          !!payment.details.checkoutUrl)
      : ["processing", "awaiting_authorization"].includes(payment.status) &&
        payment.details.initiationStarted
  ) {
    await enqueue(
      pool,
      "verify-provider",
      { reference: payment.reference },
      `status:${payment.id}:${Math.floor(Date.now() / 30000)}`,
    );
  }
  if (
    payment.kind === "deposit" &&
    payment.status === "processing" &&
    !payment.details.checkoutUrl
  )
    await enqueue(
      pool,
      "process-payment",
      { id: payment.id },
      `checkout:${payment.id}:${Math.floor(Date.now() / 30000)}`,
    );
  return json({ transaction: publicTransaction(payment) });
}
export async function checkPayment(req: Request, id: string) {
  const s = await identity(req);
  await rateLimit(`check:${s.user.id}`, 10);
  const p = await ownPayment(id, s.user.id);
  const preparingCheckout =
    p.kind === "deposit" && p.status === "processing" && !p.details.checkoutUrl;
  await enqueue(
    pool,
    preparingCheckout ? "process-payment" : "verify-provider",
    preparingCheckout ? { id: p.id } : { reference: p.reference },
    `manual:${id}:${Math.floor(Date.now() / 60000)}`,
  );
  return json(
    {
      message: preparingCheckout
        ? "We are preparing your secure checkout. It will appear here when ready."
        : "We are checking your payment. Its status will update here automatically.",
    },
    202,
  );
}
