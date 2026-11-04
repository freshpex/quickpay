import { atomic, pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { json } from "../../../../shared/infrastructure/http";
import { ensureWallet } from "../../ledger/services/post-journal";
export async function getWallet(req: Request) {
  const s = await identity(req);
  await atomic((c) => ensureWallet(c, s.user.id));
  const r = await pool.query(
    "SELECT bucket,balance FROM ledger_accounts WHERE user_id=$1",
    [s.user.id],
  );
  return json({
    currency: "NGN",
    ...Object.fromEntries(r.rows.map((a) => [a.bucket, a.balance])),
  });
}
