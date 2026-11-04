import { pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { json } from "../../../../shared/infrastructure/http";
import { assert } from "../../../../shared/errors";
import {
  publicTransaction,
  type PaymentRow,
} from "../repositories/payment.repository";
export async function recoverPayment(req: Request, key: string) {
  const s = await identity(req);
  assert(
    /^[a-zA-Z0-9_-]{16,100}$/.test(key),
    "INVALID_REFERENCE",
    "Check this request reference.",
  );
  const r = await pool.query<PaymentRow>(
    "SELECT * FROM transactions WHERE user_id=$1 AND idempotency_key=$2",
    [s.user.id, key],
  );
  return json({ transaction: r.rows[0] ? publicTransaction(r.rows[0]) : null });
}
