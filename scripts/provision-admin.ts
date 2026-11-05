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
  console.log(
    `Initial administrator ${account.email} created with verified email and all existing admin scopes. Enroll MFA before using admin tools.`,
  );
} finally {
  await pool.end();
}
