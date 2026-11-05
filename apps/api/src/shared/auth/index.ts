import { pool } from "@quickpay/database";
import { verifyTransactionPin } from "../../v1/modules/security/services/pin";
import { auth } from "../../v1/modules/auth/auth";
import { assert } from "../errors";
import { rateLimit } from "../infrastructure/http";
export async function identity(req: Request) {
  const s = await auth().api.getSession({ headers: req.headers });
  assert(s, "UNAUTHENTICATED", "Please sign in to continue.", 401);
  return s;
}
export async function authorized(req: Request, permission: string) {
  const s = await identity(req);
  const {
    rows: [u],
  } = await pool.query(
    "SELECT role,permissions,two_factor_enabled FROM users WHERE id=$1",
    [s.user.id],
  );
  assert(
    u?.role === "admin" && u.permissions.includes(permission),
    "FORBIDDEN",
    "You do not have access to this action.",
    403,
  );
  assert(
    u.two_factor_enabled,
    "MFA_REQUIRED",
    "Set up two-step verification before using admin tools.",
    403,
  );
  const elevation = await pool.query(
    "SELECT 1 FROM admin_elevations WHERE session_id=$1 AND expires_at>now()",
    [s.session.id],
  );
  assert(
    elevation.rowCount,
    "ADMIN_LOCKED",
    "Confirm your authenticator code to use admin tools.",
    403,
  );
  return s;
}
export async function authorizeMoney(req: Request, pin: string) {
  const s = await identity(req);
  assert(
    s.user.emailVerified,
    "VERIFY_CONTACT",
    "Verify your email before making a payment.",
    403,
  );
  await rateLimit(`authorize:${s.user.id}`, 5);
  await verifyTransactionPin(s.user.id, pin);
  return s;
}
