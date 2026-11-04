import { pool } from "@quickpay/database";
import { json } from "@quickpay/server/shared/infrastructure/http";
export async function GET() {
  try {
    const result = await pool.query(
      "SELECT last_seen_at > now()-interval '2 minutes' AS active FROM worker_heartbeats WHERE name='main'",
    );
    const active = result.rows[0]?.active === true;
    return json(
      {
        status: active ? "ok" : "unavailable",
        worker: active ? "active" : "missing_or_stale",
      },
      active ? 200 : 503,
    );
  } catch {
    return json({ status: "unavailable", worker: "unavailable" }, 503);
  }
}
