import { afterEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  supplierEndpoint,
  supplierSettings,
  markedUpCost,
} from "../apps/api/src/v1/modules/digital-services/providers/config";
import {
  prestmit,
  fincraQuote,
  validPrestmitWebhook,
} from "../apps/api/src/v1/modules/digital-services/providers/partner-clients";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("chooses fixed environment hosts and refuses disabled requests", () => {
  expect(supplierEndpoint("prestmit", "sandbox")).toBe(
    "https://dev-api.prestmit.io/partners/v1",
  );
  expect(supplierEndpoint("prestmit", "live")).toBe(
    "https://api.prestmit.io/partners/v1",
  );
  expect(supplierEndpoint("fincra", "live")).toBe("https://api.fincra.com");
  expect(() => supplierEndpoint("fincra", "disabled")).toThrow();
});
it("rejects invalid margins and rounds purchase prices upward in minor units", () => {
  expect(markedUpCost(101n, 300)).toBe(105n);
  expect(markedUpCost(100000n, 2000)).toBe(120000n);
  expect(() => supplierSettings({ GIFT_BUY_MARKUP_BPS: "-1" })).toThrow();
  expect(() => markedUpCost(1n, 0.5)).toThrow();
});
it("authenticates exact Prestmit query fields with HMAC", async () => {
  vi.stubEnv("PAYMENT_MODE", "sandbox");
  vi.stubEnv("PRESTMIT_API_KEY", "test-key");
  vi.stubEnv("PRESTMIT_API_SECRET", "test-secret");
  const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true }));
  vi.stubGlobal("fetch", fetcher);
  await prestmit.buyCatalog("2");
  const [url, init] = fetcher.mock.calls[0];
  expect(String(url)).toBe(
    "https://dev-api.prestmit.io/partners/v1/giftcard-trade/buy/fetch-buyable-giftcards?page=2",
  );
  expect(init.headers["API-Hash"]).toBe(
    createHmac("sha256", "test-secret")
      .update('test-key:{"page":"2"}')
      .digest("hex"),
  );
  expect(init.redirect).toBe("error");
});
it("authenticates Fincra quotes with business ID and conversion destination", async () => {
  vi.stubEnv("PAYMENT_MODE", "sandbox");
  vi.stubEnv("FINCRA_SECRET_KEY", "test-secret");
  vi.stubEnv("FINCRA_BUSINESS_ID", "business-test");
  const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true }));
  vi.stubGlobal("fetch", fetcher);
  await fincraQuote("NGN", "USD", "10000.00");
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe("https://sandboxapi.fincra.com/quotes/generate");
  expect(init.headers["api-key"]).toBe("test-secret");
  expect(JSON.parse(init.body)).toMatchObject({
    business: "business-test",
    paymentDestination: "fliqpay_wallet",
    amount: "10000.00",
    transactionType: "conversion",
  });
});
it("rejects unsupported amount representations before any request", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await expect(fincraQuote("NGN", "USD", "1e5")).rejects.toThrow();
  await expect(fincraQuote("NGN", "NGN", "1")).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it("validates webhook signatures against raw bytes and requires a secret", () => {
  const body = '{ "status": "APPROVED" }';
  const signature = createHmac("sha256", "secret")
    .update(body)
    .digest("base64");
  expect(validPrestmitWebhook(body, signature, "secret")).toBe(true);
  expect(
    validPrestmitWebhook(JSON.stringify(JSON.parse(body)), signature, "secret"),
  ).toBe(false);
  expect(validPrestmitWebhook(body, signature, "")).toBe(false);
  expect(validPrestmitWebhook(body, "bad", "secret")).toBe(false);
});
it("redacts provider error details", async () => {
  vi.stubEnv("PAYMENT_MODE", "sandbox");
  vi.stubEnv("PRESTMIT_API_KEY", "key");
  vi.stubEnv("PRESTMIT_API_SECRET", "secret");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "secret credential" }, { status: 401 }),
      ),
  );
  await expect(prestmit.availability()).rejects.toThrow(
    "Check its status before retrying",
  );
});
