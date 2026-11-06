import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../apps/api/src/shared/infrastructure/env", () => ({
  env: () => ({
    PAYMENT_MODE: "sandbox",
    PAYSTACK_SECRET_KEY: "sk_test_local_fixture",
  }),
}));
import {
  paystack,
  resolvedBankAccountSchema,
} from "../apps/api/src/v1/modules/deposits/providers/paystack";
const fetcher = vi.fn<typeof fetch>();
const account = resolvedBankAccountSchema;
const path = "bank/resolve?account_number=1234567890&bank_code=999992";
beforeEach(() => {
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => vi.unstubAllGlobals());
it.each([200, 400, 422])(
  "treats rejected account lookup as verification failure with no payment-pending claim (HTTP %s)",
  async (status) => {
    fetcher.mockResolvedValue(
      Response.json(
        { status: false, message: "Unable to resolve account" },
        { status },
      ),
    );
    await expect(paystack(path, account)).rejects.toMatchObject({
      code: "BANK_ACCOUNT_UNVERIFIED",
      status: 422,
      message: expect.stringContaining("No transfer has been made"),
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it("retries a read-only account lookup after a transient provider failure", async () => {
  fetcher
    .mockResolvedValueOnce(new Response("Temporary", { status: 503 }))
    .mockResolvedValueOnce(
      Response.json({
        status: true,
        data: {
          account_number: "1234567890",
          account_name: "VERIFIED RECIPIENT",
        },
      }),
    );
  expect(await paystack(path, account)).toEqual({
    account_number: "1234567890",
    account_name: "VERIFIED RECIPIENT",
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
  expect(fetcher.mock.calls[0][1]?.body).toBeUndefined();
});
it.each(["network", "rate-limit", "server"])(
  "returns a lookup-specific outage after %s errors",
  async (reason) => {
    if (reason === "network")
      fetcher.mockRejectedValue(new TypeError("Network lost"));
    else
      fetcher.mockResolvedValue(
        new Response("Unavailable", {
          status: reason === "rate-limit" ? 429 : 503,
        }),
      );
    await expect(paystack(path, account)).rejects.toMatchObject({
      code: "BANK_LOOKUP_UNAVAILABLE",
      status: 503,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  },
);
it("does not retry money-moving requests on an uncertain provider result", async () => {
  fetcher.mockRejectedValue(new TypeError("Network lost"));
  await expect(
    paystack("transfer", resolvedBankAccountSchema, {
      reference: "unchanged-reference",
      amount: "10000",
    }),
  ).rejects.toMatchObject({ code: "PAYMENT_PENDING" });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("identifies bank-list failures separately from payments", async () => {
  fetcher.mockResolvedValue(Response.json({ status: false }));
  await expect(
    paystack("bank?country=nigeria", resolvedBankAccountSchema.array()),
  ).rejects.toMatchObject({ code: "BANK_LIST_UNAVAILABLE", status: 503 });
});
it("does not label authentication failures as invalid bank account details", async () => {
  fetcher.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
  await expect(paystack(path, account)).rejects.toMatchObject({
    code: "BANK_LOOKUP_UNAVAILABLE",
    status: 503,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
