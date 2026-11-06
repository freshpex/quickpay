import "dotenv/config";
import { spawnSync } from "node:child_process";
const testURL = new URL(
  process.env.TEST_DATABASE_URL ||
    "postgresql://quickpay:local-development-only@localhost:5432/quickpay_test",
);
if (
  !["localhost", "127.0.0.1"].includes(testURL.hostname) ||
  !/^[a-zA-Z][a-zA-Z0-9_]*_test$/.test(testURL.pathname.slice(1))
)
  throw new Error(
    "Verification requires a disposable local TEST_DATABASE_URL ending in _test.",
  );
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error("Run verification with pnpm verify.");
const base: NodeJS.ProcessEnv = {
  ...process.env,
  TEST_DATABASE_URL: testURL.toString(),
  DATABASE_URL: testURL.toString(),
  DATABASE_URL_UNPOOLED: testURL.toString(),
  PAYMENT_MODE: "disabled",
};
function run(
  args: string[],
  extra: Partial<NodeJS.ProcessEnv> = {},
  command = process.execPath,
) {
  const result = spawnSync(
    command,
    command === process.execPath ? [pnpm!, ...args] : args,
    { stdio: "inherit", env: { ...base, ...extra } },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(["security:scan"]);
run(["audit", "--audit-level=moderate"]);
run(["lint"]);
run(["typecheck"]);
run(["test"], { NODE_ENV: "test" });
run(["--filter", "@quickpay/mobile", "exec", "expo", "install", "--check"]);
run(["mobile:export"]);
run(["build"], {
  NODE_ENV: "production",
  NEXT_BUILD_DIR: ".next-qa",
  WEB_ORIGIN: "http://localhost:3100",
  API_ORIGIN: "http://localhost:3101",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
});
const browserURL = new URL(testURL);
browserURL.pathname = `${testURL.pathname.replace(/_test$/, "")}_e2e_test`;
run(["qa:prepare"], { TEST_DATABASE_URL: browserURL.toString() });
run(["test:e2e"], {
  TEST_DATABASE_URL: browserURL.toString(),
  E2E_BASE_URL: "http://localhost:3100",
  E2E_SERVER_COMMAND: "pnpm qa:serve",
  E2E_REAL_AUTH: "true",
  E2E_PROVIDER_FIXTURES: "true",
});
console.log("All verification checks passed.");
