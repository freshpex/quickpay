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
vi.mock(
  "../apps/api/src/v1/modules/deposits/providers/paystack",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../apps/api/src/v1/modules/deposits/providers/paystack")
    >()),
    paystack: mocks.paystack,
  }),
);
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

it("keeps an abandoned or pending Paystack checkout open instead of falsely failing a deposit", async () => {
  const deposit = {
    ...payment,
    kind: "deposit",
    status: "awaiting_authorization",
    details: { checkoutUrl: "https://checkout.paystack.com/test" },
  } as PaymentRow;
  for (const status of ["abandoned", "pending", "ongoing", "processing"]) {
    mocks.paystack.mockResolvedValue({
      id: 1,
      status,
      amount: 10000,
      currency: "NGN",
      reference: deposit.reference,
      customer: { email: "owner@example.test" },
    });
    await verifyPayment(deposit);
  }
  expect(mocks.settle).not.toHaveBeenCalled();
});

it("accepts null unused phone metadata while still requiring an exact verified destination, reference and amount", async () => {
  mocks.vtpass.mockResolvedValue({
    requestId: payment.reference,
    purchased_code: undefined,
    content: {
      transactions: {
        status: "delivered",
        amount: "100",
        unique_element: "08031234567",
        phone: null,
      },
    },
  });
  await verifyPayment(payment);
  expect(mocks.settle).toHaveBeenCalledWith(
    payment.id,
    expect.objectContaining({ status: "successful", amount: payment.amount }),
  );
  mocks.settle.mockClear();
  mocks.vtpass.mockResolvedValue({
    requestId: payment.reference,
    content: {
      transactions: {
        status: "delivered",
        amount: "100",
        unique_element: null,
        phone: null,
      },
    },
  });
  await expect(verifyPayment(payment)).rejects.toMatchObject({
    code: "DESTINATION_MISMATCH",
  });
  expect(mocks.settle).not.toHaveBeenCalled();
});

it("verifies the flat requery response as well as the wrapped payment response", async () => {
  mocks.vtpass.mockResolvedValue({
    code: "000",
    requestId: payment.reference,
    content: {
      status: "delivered",
      amount: "100.00",
      unique_element: "+2348031234567",
      phone: null,
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
it("accepts an exact merchant request ID in the transaction body and rejects conflicting or missing IDs", async () => {
  const content = {
    status: "delivered",
    amount: "100",
    unique_element: "08031234567",
    request_id: payment.reference,
  };
  mocks.vtpass.mockResolvedValue({ content });
  await verifyPayment(payment);
  expect(mocks.settle).toHaveBeenCalledTimes(1);
  mocks.settle.mockClear();
  for (const response of [
    { requestId: "wrong-reference", content },
    { content: { ...content, request_id: null } },
    {
      requestId: payment.reference,
      content: { ...content, request_id: "other-reference" },
    },
  ]) {
    mocks.vtpass.mockResolvedValue(response);
    await expect(verifyPayment(payment)).rejects.toMatchObject({
      code: "REFERENCE_MISMATCH",
    });
  }
  expect(mocks.settle).not.toHaveBeenCalled();
});
it("does not settle an incomplete or wrong-recipient flat requery response", async () => {
  for (const content of [
    { status: "delivered", amount: null, unique_element: "08031234567" },
    { status: "delivered", amount: "100", unique_element: "08031234568" },
    { transactions: null },
  ]) {
    mocks.vtpass.mockResolvedValue({ requestId: payment.reference, content });
    await expect(verifyPayment(payment)).rejects.toThrow();
  }
  expect(mocks.settle).not.toHaveBeenCalled();
});

it("keeps incomplete provider verification pending and logs only safe diagnostic metadata", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.vtpass.mockResolvedValue({
    code: "011",
    response_description: "Invalid API key: private-credential",
    requestId: payment.reference,
    content: { error: "private-account-data" },
  });
  try {
    await expect(verifyPayment(payment)).rejects.toMatchObject({
      code: "PROVIDER_PENDING",
    });
    expect(mocks.settle).not.toHaveBeenCalled();
    const diagnostic = JSON.parse(log.mock.calls[0][0]);
    expect(diagnostic).toMatchObject({
      event: "provider_verification_unconfirmed",
      providerCode: "011",
      reason: "authentication",
      responseFields: ["error"],
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(
      /private-credential|private-account-data/,
    );
  } finally {
    log.mockRestore();
  }
});
