import { expect, it, vi } from "vitest";
import { createRequire } from "node:module";
const requireApi = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const sharp = requireApi(
  "sharp",
) as typeof import("../apps/api/node_modules/sharp").default;
const { PDFDocument } = requireApi(
  "pdf-lib",
) as typeof import("../apps/api/node_modules/pdf-lib");
import type { Transaction } from "@quickpay/contracts";
import { renderReceipt } from "../apps/api/src/v1/modules/payments/services/receipt";
import { phone } from "@quickpay/contracts";
import { DomainError } from "../apps/api/src/shared/errors";
const ownership = vi.hoisted(() => vi.fn());
vi.mock("../apps/api/src/shared/auth", () => ({
  identity: async () => ({ user: { id: "owner" } }),
}));
vi.mock(
  "../apps/api/src/v1/modules/payments/repositories/payment.repository",
  () => ({ ownPayment: ownership, publicTransaction: (row: unknown) => row }),
);
import { GET } from "../apps/api/src/app/api/v1/payments/[paymentId]/receipt/route";
const transaction: Transaction = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "owner",
  kind: "payment",
  status: "successful",
  amount: "10000",
  fee: "500",
  currency: "NGN",
  reference: "QP-REFERENCE<&>",
  serviceId: "mtn",
  createdAt: "2026-11-05T12:00:00.000Z",
  details: { beneficiary: "08031234567" },
};
it("generates one branded PDF page and a standalone PNG without page chrome", async () => {
  const png = await renderReceipt(transaction, "png");
  const info = await sharp(png).metadata();
  expect([info.width, info.height, info.format]).toEqual([1240, 1754, "png"]);
  const pdf = await PDFDocument.load(await renderReceipt(transaction, "pdf"));
  expect(pdf.getPageCount()).toBe(1);
  expect(pdf.getAuthor()).toBe("Quick Pay");
});
it("protects receipt downloads with transaction ownership", async () => {
  ownership.mockRejectedValueOnce(
    new DomainError("NOT_FOUND", "Not owned", 404),
  );
  const response = await GET(
    new Request("https://example.test/api/v1/payments/other/receipt"),
    { params: Promise.resolve({ paymentId: "other" }) },
  );
  expect(ownership).toHaveBeenCalledWith("other", "owner");
  expect(response.status).toBe(404);
});
it("validates Nigerian mobile formats, country, length and nonnumeric input", () => {
  for (const value of ["0803 123 4567", "+2348031234567", "2348031234567"])
    expect(phone.parse(value)).toBe("+2348031234567");
  for (const value of [
    "0803123",
    "080312345678",
    "+12025550123",
    "08031234567 ext 2",
    "08031234567abc",
    "00000000000",
  ])
    expect(phone.safeParse(value).success).toBe(false);
});
