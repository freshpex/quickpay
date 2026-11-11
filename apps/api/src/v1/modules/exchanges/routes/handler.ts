import { identity } from "../../../../shared/auth";
import { pool } from "@quickpay/database";
import { json } from "../../../../shared/infrastructure/http";
export async function exchanges(req: Request) {
  await identity(req);
  const { rows } = await pool.query<{
    id: string;
    source: string;
    target: string;
    enabled: boolean;
  }>(
    "SELECT id,source,target,enabled FROM exchange_pairs WHERE enabled=true ORDER BY source,target",
  );
  return json({
    pairs: rows,
    message: rows.length
      ? "Exchange availability can change. Request a current quote before confirming any conversion."
      : "Currency exchanges are not available yet. Supported gift-card sales are quoted in naira in Gift cards.",
  });
}
