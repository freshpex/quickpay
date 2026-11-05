// Production-build HTTP checks against the disposable local test database.
import "dotenv/config";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { staticWebServer } from "./static-web-server";
const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("QA requires a local disposable database.");
if (!process.env.TEST_DATABASE_URL) url.pathname = "/quickpay_test";
if (!/^[a-zA-Z][a-zA-Z0-9_]*_test$/.test(url.pathname.slice(1)))
  throw new Error("QA database must end in _test.");
const childEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: url.toString(),
  NEXT_BUILD_DIR: ".next-qa",
  WEB_ORIGIN: "http://localhost:3100",
  API_ORIGIN: "http://localhost:3101",
  PAYMENT_MODE: "disabled",
  PAYSTACK_TRANSFERS_ENABLED: "false",
  PAYSTACK_SECRET_KEY: "",
  VTPASS_API_KEY: "",
  MAILJET_API_KEY: "",
  MAILJET_SECRET_KEY: "",
  MAILJET_FROM_EMAIL: "",
  SMS_ENABLED: "false",
  PUSH_ENABLED: "false",
  EXPO_ACCESS_TOKEN: "",
};
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error("Run this script with pnpm qa:serve.");
const directory = fileURLToPath(
  new URL("../apps/web/.next-qa/", import.meta.url),
);
await access(`${directory}/index.html`);
const web = staticWebServer(directory, childEnv.API_ORIGIN!);
web.listen(3100, "127.0.0.1");
const children = [
  spawn(
    process.execPath,
    [
      pnpm,
      "--filter",
      "@quickpay/api",
      "exec",
      "next",
      "start",
      "--port",
      "3101",
    ],
    { env: childEnv, stdio: "inherit" },
  ),
];
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    web.close();
    for (const child of children) child.kill(signal);
  });
for (const child of children)
  child.on("exit", (code) => {
    if (code) {
      for (const other of children) if (other !== child) other.kill();
      web.close();
      process.exitCode = code;
    }
  });
