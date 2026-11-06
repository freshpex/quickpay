// Production-build HTTP checks against the disposable local test database.
import "dotenv/config";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { providerGateway } from "../tests/qa/provider-gateway";
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
  DATABASE_URL_UNPOOLED: url.toString(),
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
const withProviders = process.env.E2E_PROVIDER_FIXTURES === "true";
let providers: ReturnType<typeof providerGateway> | undefined;
if (withProviders) {
  Object.assign(childEnv, {
    PAYMENT_MODE: "sandbox",
    PAYSTACK_SECRET_KEY: `sk_test_${randomBytes(24).toString("hex")}`,
    VTPASS_ENV: "sandbox",
    VTPASS_API_KEY: "qa-fixture",
    VTPASS_SECRET_KEY: "qa-fixture",
    VTPASS_PUBLIC_KEY: "qa-fixture",
    QUICKPAY_TEST_PROVIDER_ORIGIN: "http://127.0.0.1:3190",
    MAILJET_API_KEY: "qa-fixture",
    MAILJET_SECRET_KEY: "qa-fixture",
    MAILJET_FROM_EMAIL: "no-reply@quickpay.test",
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --import=tsx --import=${fileURLToPath(new URL("../tests/qa/provider-transport.ts", import.meta.url))}`,
  });
  providers = providerGateway({
    secret: childEnv.PAYSTACK_SECRET_KEY!,
    apiOrigin: childEnv.API_ORIGIN!,
  });
  providers.listen(3190, "127.0.0.1");
}
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error("Run this script with pnpm qa:serve.");
const apiRoot = fileURLToPath(new URL("../apps/api/", import.meta.url));
const apiNext = createRequire(import.meta.url).resolve("next/dist/bin/next", {
  paths: [apiRoot],
});
const directory = fileURLToPath(
  new URL("../apps/web/.next-qa/", import.meta.url),
);
await access(`${directory}/index.html`);
const web = staticWebServer(directory, childEnv.API_ORIGIN!);
web.listen(3100, "127.0.0.1");
const children = [
  spawn(process.execPath, [apiNext, "start", "--port", "3101"], {
    cwd: apiRoot,
    env: childEnv,
    stdio: "inherit",
  }),
];
if (withProviders)
  children.push(
    spawn(process.execPath, ["--import", "tsx", "apps/worker/src/index.ts"], {
      env: childEnv,
      stdio: "inherit",
    }),
  );
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    web.close();
    providers?.close();
    for (const child of children) child.kill(signal);
  });
for (const child of children)
  child.on("exit", (code) => {
    if (code) {
      for (const other of children) if (other !== child) other.kill();
      web.close();
      providers?.close();
      process.exitCode = code;
    }
  });
