import "dotenv/config";
import { pool, atomic } from "@quickpay/database";
import { audit } from "../apps/api/src/v1/modules/admin/services/audit";
const email = process.argv[process.argv.indexOf("--email") + 1];
if (
  process.env.NODE_ENV === "production" ||
  !email ||
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL!).hostname,
  )
)
  throw new Error(
    "Use --email with an existing verified local development account. Production grants require a reviewed provisioning process.",
  );
const permissions = [
  "users.read",
  "users.write",
  "transactions.read",
  "catalog.read",
  "catalog.write",
  "gift.configure",
  "gift.review",
  "gift.settle",
  "evidence.scan",
  "exchanges.read",
  "rewards.read",
  "rewards.write",
  "support.read",
  "support.write",
  "audit.read",
  "operations.read",
  "operations.write",
];
await atomic(async (c) => {
  const {
    rows: [u],
  } = await c.query(
    "SELECT id,role,email_verified FROM users WHERE email=$1 FOR UPDATE",
    [email.toLowerCase()],
  );
  if (!u?.email_verified)
    throw new Error("Account must exist and have a verified email.");
  await c.query("UPDATE users SET role='admin',permissions=$2 WHERE id=$1", [
    u.id,
    JSON.stringify(permissions),
  ]);
  await audit(
    c,
    u.id,
    "development.admin_granted",
    u.id,
    { role: u.role },
    { role: "admin", permissions },
  );
});
console.log(
  "Development role granted. Set up an authenticator in Settings and unlock the admin console.",
);
await pool.end();
