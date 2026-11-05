import { beforeEach, expect, it, vi } from "vitest";
import type { PaymentRow } from "../apps/api/src/v1/modules/payments/repositories/payment.repository";
const mocks = vi.hoisted(() => ({
  vtpass: vi.fn(),
  settle: vi.fn(),
  query: vi.fn(),
  paystack: vi.fn(),
}));
vi.mock("../apps/api/src/v1/modules/billers/providers/vtpass", () => ({
  vtpass: mocks.vtpass,
}));
vi.mock("../apps/api/src/v1/modules/payments/services/settle-payment", () => ({
  settlePayment: mocks.settle,
}));
vi.mock("@quickpay/database", () => ({ pool: { query: mocks.query } }));
vi.mock("../apps/api/src/v1/modules/deposits/providers/paystack", () => ({
  paystack: mocks.paystack,
}));
vi.mock("../apps/api/src/shared/infrastructure/security", () => ({
  unseal: () =>
    JSON.stringify({ accountNumber: "1234567890", bankCode: "999" }),
}));
import { DomainError } from "../apps/api/src/shared/errors";
import {
  processPayment,
  verifyPayment,
} from "../apps/api/src/v1/modules/payments/jobs/process-payment";
const payment = {
  id: "test-id",
  user_id: "owner",
  fee: "0",
  provider: "vtpass",
  provider_reference: null,
  service_id: "mtn",
  created_at: new Date(),
  request_hash: "hash",
  kind: "payment",
  status: "processing",
  amount: "10000",
  currency: "NGN",
  reference: "exact-reference",
  details: { category: "airtime", beneficiary: "08031234567" },
} as PaymentRow;
beforeEach(() => {
  mocks.settle.mockReset();
  mocks.vtpass.mockReset();
  mocks.query.mockReset();
  mocks.paystack.mockReset();
});
it("settles a delivered phone payment when the provider returns the same number internationally", async () => {
  mocks.vtpass.mockResolvedValue({
    requestId: payment.reference,
    content: {
      transactions: {
        status: "delivered",
        amount: "100",
        phone: "+2348031234567",
      },
    },
  });
  await verifyPayment(payment);
  expect(mocks.settle).toHaveBeenCalledWith(
    payment.id,
    expect.objectContaining({
      status: "successful",
      amount: "10000",
      reference: payment.reference,
    }),
  );
});
it("does not settle a different recipient or a mismatched bill account", async () => {
  mocks.vtpass.mockResolvedValue({
    requestId: payment.reference,
    content: {
      transactions: {
        status: "delivered",
        amount: "100",
        phone: "+2348031234568",
      },
    },
  });
  await expect(verifyPayment(payment)).rejects.toMatchObject({
    code: "DESTINATION_MISMATCH",
  });
  expect(mocks.settle).not.toHaveBeenCalled();
});

it("releases a withdrawal only on a definitive provider rejection, never on an uncertain network result", async () => {
  for (const definitive of [true, false]) {
    mocks.settle.mockClear();
    mocks.paystack.mockReset();
    mocks.query.mockReset();
    const withdrawal = {
      ...payment,
      kind: "withdrawal",
      details: { encryptedDestination: "encrypted", accountName: "Test" },
    };
    mocks.query
      .mockResolvedValueOnce({ rows: [withdrawal] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: payment.id }] });
    mocks.paystack
      .mockResolvedValueOnce({ recipient_code: "expected-recipient" })
      .mockRejectedValueOnce(
        definitive
          ? new DomainError("PROVIDER_REJECTED", "Declined", 422)
          : new TypeError("Network lost"),
      );
    if (definitive) {
      await processPayment(payment.id);
      expect(mocks.settle).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({
          status: "failed",
          recipient: "expected-recipient",
          amount: payment.amount,
          reference: payment.reference,
        }),
      );
    } else {
      await expect(processPayment(payment.id)).rejects.toThrow("Network lost");
      expect(mocks.settle).not.toHaveBeenCalled();
    }
  }
});
