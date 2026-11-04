import { pool } from "@quickpay/database";
import { z } from "zod";
import {
  paystack,
  verifiedDepositSchema,
  verifiedTransferSchema,
} from "../../deposits/providers/paystack";
import { vtpass } from "../../billers/providers/vtpass";
import { unseal } from "../../../../shared/infrastructure/security";
import { env } from "../../../../shared/infrastructure/env";
import { assert } from "../../../../shared/errors";
import { settlePayment } from "../services/settle-payment";
import type { PaymentRow } from "../repositories/payment.repository";
import { parseNaira } from "@quickpay/contracts";
export async function verifyPayment(p: PaymentRow) {
  if (p.kind === "deposit") {
    const data = await paystack(
      `transaction/verify/${encodeURIComponent(p.reference)}`,
      verifiedDepositSchema,
    );
    if (data.status === "success")
      await settlePayment(p.id, {
        status: "successful",
        amount: String(data.amount),
        currency: data.currency,
        reference: data.reference,
        email: data.customer.email,
      });
    else if (["failed", "abandoned"].includes(data.status))
      await settlePayment(p.id, {
        status: "failed",
        amount: String(data.amount),
        currency: data.currency,
        reference: data.reference,
        email: data.customer.email,
      });
  } else if (p.kind === "withdrawal" && p.details.recipientCode) {
    const data = await paystack(
      `transfer/verify/${encodeURIComponent(p.reference)}`,
      verifiedTransferSchema,
    );
    const status =
      data.status === "success"
        ? "successful"
        : data.status === "failed"
          ? "failed"
          : data.status === "reversed"
            ? "reversed"
            : null;
    if (status)
      await settlePayment(p.id, {
        status,
        amount: String(data.amount),
        currency: data.currency,
        reference: data.reference,
        recipient: data.recipient.recipient_code,
      });
  } else if (p.kind === "payment") {
    const data = await vtpass("requery", "POST", { request_id: p.reference });
    const content = z
      .object({
        transactions: z.object({
          status: z.string(),
          amount: z.union([z.string(), z.number()]),
          unique_element: z.string().optional(),
          phone: z.string().optional(),
        }),
      })
      .parse(data.content);
    assert(
      data.requestId === p.reference,
      "REFERENCE_MISMATCH",
      "This payment needs a further check.",
      409,
    );
    const destination =
      content.transactions.unique_element || content.transactions.phone;
    assert(
      destination === p.details.beneficiary,
      "DESTINATION_MISMATCH",
      "This payment needs a further check.",
      409,
    );
    const status =
      content.transactions.status === "delivered"
        ? "successful"
        : content.transactions.status === "reversed"
          ? "reversed"
          : content.transactions.status === "failed"
            ? "failed"
            : null;
    if (status)
      await settlePayment(p.id, {
        status,
        amount: parseNaira(String(content.transactions.amount)),
        currency: "NGN",
        reference: data.requestId!,
        fulfillment: data.purchased_code,
      });
  }
}
export async function processPayment(id: string) {
  const {
    rows: [p],
  } = await pool.query<PaymentRow>("SELECT * FROM transactions WHERE id=$1", [
    id,
  ]);
  if (!p || p.status !== "processing") return;
  if (p.details.initiationStarted) {
    await verifyPayment(p);
    return;
  }
  if (p.kind === "deposit") {
    const {
      rows: [u],
    } = await pool.query("SELECT email FROM users WHERE id=$1", [p.user_id]);
    const data = await paystack(
      "transaction/initialize",
      z.object({
        authorization_url: z.url(),
        access_code: z.string(),
        reference: z.string(),
      }),
      {
        email: u.email,
        amount: p.amount,
        currency: "NGN",
        reference: p.reference,
        callback_url: `${env().WEB_ORIGIN}/transactions/${p.id}`,
        metadata: { transactionId: p.id },
      },
    );
    const url = new URL(data.authorization_url);
    assert(
      url.protocol === "https:" &&
        (url.hostname === "checkout.paystack.com" ||
          url.hostname.endsWith(".paystack.com")),
      "CHECKOUT_INVALID",
      "Checkout is not available yet.",
      503,
    );
    await pool.query(
      "UPDATE transactions SET status='awaiting_authorization',details=details||$2::jsonb,updated_at=now() WHERE id=$1",
      [id, JSON.stringify({ checkoutUrl: data.authorization_url })],
    );
    return;
  }
  if (p.kind === "withdrawal") {
    const dest = z
      .object({ accountNumber: z.string(), bankCode: z.string() })
      .parse(JSON.parse(unseal(String(p.details.encryptedDestination))));
    const recipient = await paystack(
      "transferrecipient",
      z.object({ recipient_code: z.string() }),
      {
        type: "nuban",
        name: p.details.accountName,
        account_number: dest.accountNumber,
        bank_code: dest.bankCode,
        currency: "NGN",
      },
    );
    // Persist intent before the external side effect. A crash after this point reconciles only.
    const claimed = await pool.query(
      "UPDATE transactions SET details=details||$2::jsonb WHERE id=$1 AND NOT(details ? 'initiationStarted') RETURNING id",
      [
        id,
        JSON.stringify({
          recipientCode: recipient.recipient_code,
          initiationStarted: true,
        }),
      ],
    );
    if (!claimed.rowCount) return;
    await paystack(
      "transfer",
      z.object({
        reference: z.string(),
        status: z.string(),
        transfer_code: z.string(),
      }),
      {
        source: "balance",
        amount: p.amount,
        recipient: recipient.recipient_code,
        reason: "Quick Pay wallet withdrawal",
        reference: p.reference,
      },
    );
  } else if (p.kind === "payment") {
    const claimed = await pool.query(
      "UPDATE transactions SET details=details||'{\"initiationStarted\":true}'::jsonb WHERE id=$1 AND NOT(details ? 'initiationStarted') RETURNING id",
      [id],
    );
    if (!claimed.rowCount) return;
    const amount = BigInt(p.amount);
    assert(
      amount % 100n === 0n,
      "WHOLE_NAIRA_REQUIRED",
      "Choose a whole naira amount.",
    );
    await vtpass("pay", "POST", {
      request_id: p.reference,
      serviceID: p.service_id,
      amount: (amount / 100n).toString(),
      billersCode: p.details.beneficiary,
      phone: p.details.phone || p.details.beneficiary,
      variation_code: p.details.plan || p.details.type,
    });
  }
  const {
    rows: [updated],
  } = await pool.query<PaymentRow>("SELECT * FROM transactions WHERE id=$1", [
    id,
  ]);
  await verifyPayment(updated);
}
