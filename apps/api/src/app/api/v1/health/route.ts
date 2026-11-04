import { pool } from "@quickpay/database";
import { json } from "@quickpay/server/shared/infrastructure/http";
import { env } from "@quickpay/server/shared/infrastructure/env";
export async function GET() {
  try {
    await pool.query("SELECT 1");
    return json({
      status: "ok",
      database: "available",
      paymentMode: env().PAYMENT_MODE,
    });
  } catch {
    return json({ status: "unavailable" }, 503);
  }
}
