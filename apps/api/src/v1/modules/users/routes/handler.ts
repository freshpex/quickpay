import { z } from "zod";
import { pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { body, json } from "../../../../shared/infrastructure/http";
export async function profile(req: Request) {
  const s = await identity(req);
  if (req.method === "PATCH") {
    const v = await body(
      req,
      z.object({ name: z.string().trim().min(3).max(100) }),
    );
    await pool.query("UPDATE users SET name=$1,updated_at=now() WHERE id=$2", [
      v.name,
      s.user.id,
    ]);
    return json({ message: "Your profile has been updated." });
  }
  const {
    rows: [u],
  } = await pool.query(
    "SELECT id,name,email,email_verified,phone_number,phone_verified,policy_version,policy_accepted_at,two_factor_enabled FROM users WHERE id=$1",
    [s.user.id],
  );
  return json({ user: u });
}
