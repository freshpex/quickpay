import { z } from "zod";
import { pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { body, json, rateLimit } from "../../../../shared/infrastructure/http";
import { assert } from "../../../../shared/errors";
export async function support(req: Request) {
  const s = await identity(req);
  if (req.method === "GET")
    return json({
      requests: (
        await pool.query(
          "SELECT * FROM support_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
          [s.user.id],
        )
      ).rows,
    });
  await rateLimit(`support:${s.user.id}`, 5);
  const v = await body(
    req,
    z.object({
      subject: z.string().trim().min(5).max(150),
      message: z.string().trim().min(10).max(3000),
      transactionId: z.string().uuid().optional(),
    }),
  );
  if (v.transactionId)
    assert(
      (
        await pool.query(
          "SELECT 1 FROM transactions WHERE id=$1 AND user_id=$2",
          [v.transactionId, s.user.id],
        )
      ).rowCount,
      "NOT_FOUND",
      "We could not find that payment.",
      404,
    );
  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO support_requests(id,user_id,subject,message,transaction_id) VALUES($1,$2,$3,$4,$5)",
    [id, s.user.id, v.subject, v.message, v.transactionId],
  );
  return json({ id, message: "Your request has been sent." }, 201);
}
