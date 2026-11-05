import { atomic } from "@quickpay/database";
import { z } from "zod";
import { audit } from "./audit";

export async function verifyAdminEmail(email: string) {
  const address = z.string().trim().toLowerCase().pipe(z.email()).parse(email);
  return atomic(async (c) => {
    const {
      rows: [user],
    } = await c.query(
      "SELECT id,email,email_verified FROM users WHERE email=$1 AND role='admin' FOR UPDATE",
      [address],
    );
    if (!user)
      throw new Error("No administrator exists with that email address.");
    if (!user.email_verified) {
      await c.query(
        "UPDATE users SET email_verified=true,updated_at=now() WHERE id=$1",
        [user.id],
      );
      await audit(
        c,
        user.id,
        "admin.email_verified_by_operator",
        user.id,
        { emailVerified: false },
        { emailVerified: true, source: "operator-request" },
      );
    }
    return { email: user.email, verified: true };
  });
}
