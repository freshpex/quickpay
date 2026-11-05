import { atomic } from "@quickpay/database";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { phone, POLICY_VERSION } from "@quickpay/contracts";
import { adminPermissions } from "../domain/permissions";
import { ensureWallet } from "../../ledger/services/post-journal";
import { audit } from "./audit";
// Operator-only initial provisioning. Ordinary signup/change/reset retain the
// shared 12-character policy; no default password or HTTP bootstrap route exists.
export const bootstrapAdminSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phoneNumber: phone,
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/\d/),
});
export async function bootstrapAdmin(input: unknown) {
  const value = bootstrapAdminSchema.parse(input),
    id = crypto.randomUUID();
  const encoded = await hashPassword(value.password);
  await atomic(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(74003)");
    if (
      (
        await c.query(
          "SELECT 1 FROM users WHERE role='admin' OR email=$1 OR phone_number=$2",
          [value.email, value.phoneNumber],
        )
      ).rowCount
    )
      throw new Error(
        "Initial admin provisioning requires no existing admin or matching account. Existing credentials were not changed.",
      );
    await c.query(
      "INSERT INTO users(id,name,email,email_verified,phone_number,phone_verified,policy_version,policy_accepted_at,referral_code,role,permissions) VALUES($1,'Quick Pay Administrator',$2,true,$3,false,$4,now(),$5,'admin',$6)",
      [
        id,
        value.email,
        value.phoneNumber,
        POLICY_VERSION,
        crypto.randomUUID().replaceAll("-", "").slice(0, 12),
        JSON.stringify(adminPermissions),
      ],
    );
    await c.query(
      "INSERT INTO auth_accounts(id,account_id,provider_id,user_id,password) VALUES($1,$2,'credential',$2,$3)",
      [crypto.randomUUID(), id, encoded],
    );
    await ensureWallet(c, id);
    await audit(c, id, "admin.initial_provisioned", id, null, {
      role: "admin",
      permissions: adminPermissions,
      emailVerified: true,
      mfaRequired: true,
      source: "operator-request",
    });
  });
  return { id, email: value.email };
}
