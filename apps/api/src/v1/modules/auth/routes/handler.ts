import { z } from "zod";
import { pool } from "@quickpay/database";
import { POLICY_VERSION, signUpSchema, password } from "@quickpay/contracts";
import { auth } from "../auth";
import { body, json, rateLimit } from "../../../../shared/infrastructure/http";
import { DomainError } from "../../../../shared/errors";
export async function handleAuth(req: Request) {
  const path = new URL(req.url).pathname;
  if (req.method === "POST")
    await rateLimit(
      `auth:${req.headers.get("x-real-ip") || "local"}:${path}`,
      30,
    );
  // Better Auth validates origin, session cookies and auth-specific CSRF internally.
  if (req.method === "POST" && path.endsWith("/sign-up/email")) {
    await rateLimit(`signup:${req.headers.get("x-real-ip") || "local"}`, 10);
    const v = await body(req, signUpSchema);
    const existingPhone = await pool.query(
      "SELECT 1 FROM users WHERE phone_number=$1",
      [v.phoneNumber],
    );
    if (existingPhone.rowCount)
      throw new DomainError(
        "PHONE_IN_USE",
        "This phone number is already linked to an account. Sign in or use another number.",
        409,
        { phoneNumber: ["This phone number is already linked to an account."] },
      );
    let invitedBy: string | undefined;
    if (v.referralCode) {
      const r = await pool.query(
        "SELECT id FROM users WHERE referral_code=$1",
        [v.referralCode],
      );
      if (!r.rowCount)
        throw new DomainError(
          "REFERRAL_INVALID",
          "Check the referral code and try again.",
          400,
          { referralCode: ["Check this referral code or leave it blank."] },
        );
      invitedBy = r.rows[0].id;
    }
    const response = await auth().handler(
      new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify({
          name: v.name,
          email: v.email,
          password: v.password,
          phoneNumber: v.phoneNumber,
          policyVersion: POLICY_VERSION,
          policyAcceptedAt: new Date().toISOString(),
          referralCode: crypto.randomUUID().replaceAll("-", "").slice(0, 12),
          callbackURL: "/sign-in?verified=1",
        }),
      }),
    );
    if (response.ok && invitedBy)
      await pool.query(
        "UPDATE users SET invited_by=$1 WHERE email=$2 AND id<>$1",
        [invitedBy, v.email.toLowerCase()],
      );
    return response;
  }
  if (req.method === "POST" && path.endsWith("/request-password-reset")) {
    await rateLimit("password-reset", 20);
    const v = await body(req, z.object({ email: z.email() }));
    await auth().api.requestPasswordReset({
      body: { email: v.email, redirectTo: "/reset-password" },
      headers: req.headers,
    });
    return json({
      message: "If that email is registered, a reset link is on its way.",
    });
  }
  if (
    req.method === "POST" &&
    (path.endsWith("/reset-password") || path.endsWith("/change-password"))
  ) {
    const v = await body(
      req,
      z.object({
        newPassword: password,
        token: z.string().optional(),
        currentPassword: z.string().optional(),
        revokeOtherSessions: z.boolean().optional(),
      }),
    );
    return auth().handler(
      new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify(v),
      }),
    );
  }
  return auth().handler(req);
}
