import { queueSecurityEmail } from "../../../../shared/infrastructure/email/queue";
import { z } from "zod";
import { pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { body, json, rateLimit } from "../../../../shared/infrastructure/http";
import { assert } from "../../../../shared/errors";
import { auth } from "../../auth/auth";
import { audit } from "../services/audit";
export async function adminAccess(req: Request) {
  const s = await identity(req);
  const {
    rows: [u],
  } = await pool.query(
    "SELECT role,two_factor_enabled FROM users WHERE id=$1",
    [s.user.id],
  );
  assert(
    u.role === "admin",
    "FORBIDDEN",
    "You do not have access to admin tools.",
    403,
  );
  const valid = await pool.query(
    "SELECT 1 FROM admin_elevations WHERE session_id=$1 AND expires_at>now()",
    [s.session.id],
  );
  return json({
    allowed: !!valid.rowCount && u.two_factor_enabled,
    mfaEnabled: u.two_factor_enabled,
  });
}
export async function unlockAdmin(req: Request) {
  const s = await identity(req);
  const {
    rows: [u],
  } = await pool.query(
    "SELECT role,two_factor_enabled,email_verified FROM users WHERE id=$1",
    [s.user.id],
  );
  assert(
    u.role === "admin" && u.email_verified,
    "FORBIDDEN",
    "You do not have access to admin tools.",
    403,
  );
  assert(
    u.two_factor_enabled,
    "MFA_REQUIRED",
    "Set up an authenticator in Settings first.",
    403,
  );
  await rateLimit(`admin-unlock:${s.user.id}`, 5);
  const v = await body(req, z.object({ code: z.string().regex(/^\d{6}$/) }));
  await auth().api.verifyTOTP({ headers: req.headers, body: { code: v.code } });
  await pool.query(
    "INSERT INTO admin_elevations(session_id,expires_at) VALUES($1,now()+interval '15 minutes') ON CONFLICT(session_id) DO UPDATE SET expires_at=excluded.expires_at",
    [s.session.id],
  );
  await audit(pool, s.user.id, "admin.unlocked", s.session.id, null, {
    expiresInMinutes: 15,
  });
  await queueSecurityEmail(
    s.user.id,
    "Admin tools unlocked",
    "An authenticator check unlocked your Quick Pay admin tools for 15 minutes. If this was not you, secure your account immediately.",
    `admin-unlock:${crypto.randomUUID()}`,
  );
  return json({ message: "Admin tools unlocked for 15 minutes." });
}
