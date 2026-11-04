import "dotenv/config";
import { maintenanceDatabaseUrl } from "./database-url";
if (!process.argv.includes("--provision-initial-admin"))
  throw new Error(
    "Use --provision-initial-admin only for an explicitly authorized first administrator.",
  );
process.env.DATABASE_URL = maintenanceDatabaseUrl(process.env);
const { bootstrapAdmin } =
  await import("../apps/api/src/v1/modules/admin/services/bootstrap");
const { pool } = await import("../packages/database/src/index");
try {
  const account = await bootstrapAdmin({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    phoneNumber: process.env.BOOTSTRAP_ADMIN_PHONE,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const { auth } = await import("../apps/api/src/v1/modules/auth/auth");
  await auth().api.sendVerificationEmail({
    body: { email: account.email, callbackURL: "/sign-in?verified=1" },
  });
  console.log(
    `Initial administrator ${account.email} created with all existing admin scopes. Verification email queued. Verify email and enroll MFA before using admin tools.`,
  );
} finally {
  await pool.end();
}
