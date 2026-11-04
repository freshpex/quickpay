import { z } from "zod";
import { pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { body, json } from "../../../../shared/infrastructure/http";
import { assert } from "../../../../shared/errors";
export async function notifications(req: Request) {
  const s = await identity(req);
  if (req.method === "PATCH") {
    const v = await body(req, z.object({ id: z.string().uuid() }));
    const r = await pool.query(
      "UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2",
      [v.id, s.user.id],
    );
    assert(
      r.rowCount,
      "NOT_FOUND",
      "We could not find that notification.",
      404,
    );
    return json({ message: "Marked as read." });
  }
  return json({
    notifications: (
      await pool.query(
        "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
        [s.user.id],
      )
    ).rows,
  });
}
