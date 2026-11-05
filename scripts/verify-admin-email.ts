import "dotenv/config";
import { maintenanceDatabaseUrl } from "./database-url";
const index = process.argv.indexOf("--email");
if (index < 0 || !process.argv[index + 1])
  throw new Error("Specify the existing administrator with --email.");
process.env.DATABASE_URL = maintenanceDatabaseUrl(process.env);
const { verifyAdminEmail } =
  await import("../apps/api/src/v1/modules/admin/services/verify-email");
const { pool } = await import("../packages/database/src/index");
try {
  const result = await verifyAdminEmail(process.argv[index + 1]);
  console.log(`Administrator ${result.email} has a verified email.`);
} finally {
  await pool.end();
}
