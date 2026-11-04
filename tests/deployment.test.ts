import { afterEach, beforeEach, expect, it, vi } from "vitest";
const settings = vi.hoisted(() => ({
  MAILJET_API_KEY: "fixture",
  MAILJET_SECRET_KEY: "fixture",
  MAILJET_FROM_EMAIL: "sender@example.com",
  UPLOAD_DIR: "/var/data/evidence",
  SMS_ENABLED: "false",
  TERMII_API_KEY: "",
  TERMII_BASE_URL: "",
  TERMII_SENDER_ID: "",
}));
const query = vi.hoisted(() => vi.fn());
vi.mock("../apps/api/src/shared/infrastructure/env", () => ({
  env: () => settings,
}));
vi.mock("@quickpay/database", () => ({ pool: { query } }));
import { checkDeployment } from "../scripts/check-deployment";
import { GET as workerHealth } from "../apps/api/src/app/api/v1/health/worker/route";
beforeEach(() => {
  vi.stubEnv("WEB_ORIGIN", "https://quickpay.example.com");
  vi.stubEnv("API_HOSTPORT", "quickpay-api:10000");
  settings.MAILJET_API_KEY = "fixture";
  settings.UPLOAD_DIR = "/var/data/evidence";
  query.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
it("refuses a deployed app pointing to localhost", () => {
  vi.stubEnv("WEB_ORIGIN", "http://localhost:3000");
  expect(() => checkDeployment("web")).toThrow("public HTTPS");
});
it("refuses to start an email worker without delivery credentials", () => {
  settings.MAILJET_API_KEY = "";
  expect(() => checkDeployment("worker")).toThrow("MAILJET_API_KEY");
});
it("requires persistent evidence storage for the deployed API", () => {
  settings.UPLOAD_DIR = ".local/evidence";
  expect(() => checkDeployment("api")).toThrow("persistent disk");
});
it("reports a stale or missing worker as unhealthy", async () => {
  query.mockResolvedValue({ rows: [] });
  const response = await workerHealth();
  expect(response.status).toBe(503);
  expect((await response.json()).worker).toBe("missing_or_stale");
});
it("reports a worker with a fresh heartbeat as healthy", async () => {
  query.mockResolvedValue({ rows: [{ active: true }] });
  expect((await workerHealth()).status).toBe(200);
});
