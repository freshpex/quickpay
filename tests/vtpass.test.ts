import { afterEach, expect, it, vi } from "vitest";
vi.mock("../apps/api/src/shared/infrastructure/env", () => ({
  env: () => ({
    PAYMENT_MODE: "sandbox",
    VTPASS_ENV: "sandbox",
    VTPASS_API_KEY: "fixture",
    VTPASS_SECRET_KEY: "fixture",
    VTPASS_PUBLIC_KEY: "fixture",
  }),
}));
import { vtpass } from "../apps/api/src/v1/modules/billers/providers/vtpass";
afterEach(() => vi.unstubAllGlobals());
it("normalizes null optional provider metadata without discarding the required verification content", async () => {
  const content = {
    transactions: {
      status: "delivered",
      amount: "100",
      unique_element: "08031234567",
      phone: null,
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        code: "000",
        response_description: null,
        content,
        requestId: "exact-reference",
        amount: null,
        purchased_code: null,
      }),
    ),
  );
  expect(
    await vtpass("requery", "POST", { request_id: "exact-reference" }),
  ).toMatchObject({
    content,
    requestId: "exact-reference",
    amount: undefined,
    purchased_code: undefined,
  });
});
it("keeps invalid required verification values intact for the financial verification guard to reject", async () => {
  const content = { transactions: { status: "delivered", amount: null } };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ content, requestId: null, purchased_code: null }),
    ),
  );
  const result = await vtpass("requery", "POST", {
    request_id: "exact-reference",
  });
  expect(result.requestId).toBeUndefined();
  expect(result.content).toEqual(content);
});
