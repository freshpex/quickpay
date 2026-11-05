import { expect, it } from "vitest";
import { paymentSchema } from "@quickpay/contracts";
import { jobError } from "../apps/worker/src/job-error";
import { DomainError } from "../apps/api/src/shared/errors";
it("records validation field paths without customer values or raw provider messages", () => {
  const parsed = paymentSchema.safeParse({
    serviceId: "mtn",
    beneficiary: "private-account-value",
    amount: null,
    pin: "private-secret",
  });
  expect(parsed.success).toBe(false);
  if (parsed.success) throw new Error("Expected invalid test input");
  const diagnostic = jobError(parsed.error);
  expect(diagnostic.code).toBe("ZodError");
  expect(diagnostic.issues).toContainEqual({
    path: "amount",
    code: "invalid_type",
  });
  expect(JSON.stringify(diagnostic)).not.toMatch(
    /private-account-value|private-secret/,
  );
  expect(
    jobError(new DomainError("PAYMENT_PENDING", "private provider response")),
  ).toEqual({ code: "PAYMENT_PENDING" });
});
