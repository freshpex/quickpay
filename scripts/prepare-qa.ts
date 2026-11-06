import "dotenv/config";
import pg from "pg";
import { spawnSync } from "node:child_process";
const url = new URL(
  process.env.TEST_DATABASE_URL || "postgresql://localhost/invalid",
);
const name = url.pathname.slice(1);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  !/^[a-zA-Z][a-zA-Z0-9_]*_test$/.test(name)
)
  throw new Error(
    "QA preparation requires an explicit local TEST_DATABASE_URL ending in _test.",
  );
const admin = new URL(url);
admin.pathname = "/postgres";
const pool = new pg.Pool({ connectionString: admin.toString() });
try {
  if (
    !(await pool.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]))
      .rowCount
  )
    await pool.query(`CREATE DATABASE "${name}"`);
} finally {
  await pool.end();
}
if (!process.env.npm_execpath) throw new Error("Run QA preparation with pnpm.");
const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, "db:migrate"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: url.toString(),
      DATABASE_URL_UNPOOLED: url.toString(),
      PAYMENT_MODE: "disabled",
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
