import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConfigurationError } from "../apps/api/src/shared/errors";
vi.mock("@quickpay/database", () => ({ pool: { query: vi.fn() } }));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/quickpay_test");
  vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
  vi.stubEnv("DATA_ENCRYPTION_KEY", "b".repeat(64));
  vi.stubEnv("PAYSTACK_SECRET_KEY", "");
  vi.stubEnv("MAILJET_FROM_EMAIL", "");
  vi.stubEnv("PAYMENT_MODE", "disabled");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("reports invalid server settings as 503 without leaking configuration fields to the customer", async () => {
  vi.stubEnv("PAYMENT_MODE", "enabled");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const { env } = await import("../apps/api/src/shared/infrastructure/env");
  const { endpoint } =
    await import("../apps/api/src/shared/infrastructure/http");
  const response = await endpoint(async () => {
    env();
    return new Response();
  }, false)(new Request("http://localhost/api/v1/auth/sign-up/email"), {
    params: Promise.resolve({}),
  });
  expect(response.status).toBe(503);
  const body = await response.json();
  expect(body.error.code).toBe("UNAVAILABLE");
  expect(body.error.fields).toBeUndefined();
  expect(JSON.stringify(body)).not.toContain("PAYMENT_MODE");
  expect(log).toHaveBeenCalled();
});
it("does not cache a provider configuration that failed validation", async () => {
  vi.stubEnv("PAYMENT_MODE", "sandbox");
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_fixture");
  const { env } = await import("../apps/api/src/shared/infrastructure/env");
  expect(() => env()).toThrow("Server configuration");
  expect(() => env()).toThrow("Server configuration");
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_fixture");
  expect(env().PAYMENT_MODE).toBe("sandbox");
});
it("keeps form validation a 422 with specific field messages", async () => {
  const { endpoint, body } =
    await import("../apps/api/src/shared/infrastructure/http");
  const { signUpSchema } = await import("@quickpay/contracts");
  const response = await endpoint(async (request) => {
    await body(request, signUpSchema);
    return new Response();
  }, false)(
    new Request("http://localhost/signup", {
      method: "POST",
      body: JSON.stringify({ email: "invalid" }),
    }),
    { params: Promise.resolve({}) },
  );
  expect(response.status).toBe(422);
  expect((await response.json()).error.fields.email).toContain(
    "Enter a valid email address.",
  );
});
it("configuration errors only retain setting names", () => {
  const error = new ConfigurationError(["PAYMENT_MODE"]);
  expect(error.fields).toEqual(["PAYMENT_MODE"]);
  expect(error.message).not.toContain("enabled");
});
it("enables configured sandbox providers and keeps VTpass on the matching environment", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PAYMENT_MODE", "sandbox");
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("VTPASS_API_KEY", "sandbox-fixture");
  vi.stubEnv("VTPASS_SECRET_KEY", "sandbox-fixture");
  vi.stubEnv("VTPASS_PUBLIC_KEY", "sandbox-fixture");
  vi.stubEnv("VTPASS_ENV", "sandbox");
  const { env } = await import("../apps/api/src/shared/infrastructure/env");
  const { paystackConfigured, withdrawalsConfigured } =
    await import("../apps/api/src/v1/modules/deposits/providers/paystack");
  const { vtpassConfigured } =
    await import("../apps/api/src/v1/modules/billers/providers/vtpass");
  expect(paystackConfigured()).toBe(true);
  expect(vtpassConfigured()).toBe(true);
  expect(withdrawalsConfigured()).toBe(true);
  env().VTPASS_ENV = "live";
  expect(vtpassConfigured()).toBe(false);
  expect(paystackConfigured()).toBe(true);
  env().PAYMENT_MODE = "live";
  env().PAYSTACK_TRANSFERS_ENABLED = "false";
  expect(withdrawalsConfigured()).toBe(false);
  env().PAYSTACK_TRANSFERS_ENABLED = "true";
  expect(withdrawalsConfigured()).toBe(true);
  env().PAYMENT_MODE = "disabled";
  expect(paystackConfigured()).toBe(false);
  expect(vtpassConfigured()).toBe(false);
});
