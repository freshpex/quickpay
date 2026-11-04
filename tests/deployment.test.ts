import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { supervise } from "../scripts/deployment-processes";
const settings = vi.hoisted(() => ({
  MAILJET_API_KEY: "fixture",
  MAILJET_SECRET_KEY: "fixture",
  MAILJET_FROM_EMAIL: "sender@example.com",
  UPLOAD_STORAGE: "database",
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
  vi.stubEnv("API_ORIGIN", "https://quickpay-api.example.com");
  vi.stubEnv("RENDER", "true");
  settings.MAILJET_API_KEY = "fixture";
  settings.UPLOAD_STORAGE = "database";
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
it("uses encrypted database evidence without requiring a paid disk", () => {
  expect(() => checkDeployment("api")).not.toThrow();
  settings.UPLOAD_STORAGE = "filesystem";
  expect(() => checkDeployment("api")).toThrow("UPLOAD_STORAGE=database");
});
it("requires the public HTTPS API because free Render services cannot receive private traffic", () => {
  vi.stubEnv("API_ORIGIN", "");
  vi.stubEnv("API_HOSTPORT", "quickpay-api:10000");
  expect(() => checkDeployment("web")).toThrow("public HTTPS");
});
it("stops the API if its co-hosted worker exits unexpectedly", () => {
  const api = Object.assign(new EventEmitter(), { kill: vi.fn() });
  const worker = Object.assign(new EventEmitter(), { kill: vi.fn() });
  const exit = vi.fn();
  supervise([api, worker] as unknown as ChildProcess[], exit);
  worker.emit("exit", 0);
  expect(api.kill).toHaveBeenCalledWith("SIGTERM");
  expect(exit).toHaveBeenCalledWith(1);
  api.emit("exit", 0);
});
it("forwards normal platform shutdown to both processes", () => {
  const api = Object.assign(new EventEmitter(), { kill: vi.fn() });
  const worker = Object.assign(new EventEmitter(), { kill: vi.fn() });
  const exit = vi.fn();
  const stop = supervise([api, worker] as unknown as ChildProcess[], exit);
  stop("SIGTERM");
  expect(api.kill).toHaveBeenCalledWith("SIGTERM");
  expect(worker.kill).toHaveBeenCalledWith("SIGTERM");
  expect(exit).toHaveBeenCalledWith(0);
  api.emit("exit", 0);
  worker.emit("exit", 0);
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
