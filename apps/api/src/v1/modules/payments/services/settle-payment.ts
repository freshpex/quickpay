import { formatMoney } from "@quickpay/contracts";
import { env } from "../../../../shared/infrastructure/env";
import { queueUserEmail } from "../../../../shared/infrastructure/email/queue";
import { atomic, enqueue } from "@quickpay/database";
import { assert } from "../../../../shared/errors";
import { postJournal, ensureWallet } from "../../ledger/services/post-journal";
import { transition } from "../domain/payment-state";
import { awardRewards, reverseRewards } from "../../rewards/services/rewards";
import type { PaymentRow } from "../repositories/payment.repository";
export type VerifiedOutcome = {
  status: "successful" | "failed" | "reversed";
  amount: string;
  currency: string;
  reference: string;
  recipient?: string;
  email?: string;
  fulfillment?: string;
};
export async function settlePayment(id: string, outcome: VerifiedOutcome) {
  return atomic(async (c) => {
    const {
      rows: [p],
    } = await c.query<PaymentRow>(
      "SELECT * FROM transactions WHERE id=$1 FOR UPDATE",
      [id],
    );
    assert(p, "PAYMENT_NOT_FOUND", "We could not find this payment.", 404);
    assert(
      p.reference === outcome.reference &&
        p.amount === outcome.amount &&
        p.currency === outcome.currency,
      "VERIFICATION_MISMATCH",
      "This payment needs a further check.",
      409,
    );
    if (p.status === outcome.status) return false;
    if (p.kind === "deposit") {
      const {
        rows: [u],
      } = await c.query("SELECT email FROM users WHERE id=$1", [p.user_id]);
      assert(
        outcome.email?.toLowerCase() === u.email.toLowerCase(),
        "DESTINATION_MISMATCH",
        "This payment needs a further check.",
        409,
      );
    } else if (p.kind === "withdrawal")
      assert(
        outcome.recipient === p.details.recipientCode,
        "DESTINATION_MISMATCH",
        "This transfer needs a further check.",
        409,
      );
    // A late charge confirmation can follow a failed checkout attempt. Never downgrade
    // confirmed deposits when an older failure response arrives out of order.
    if (
      p.kind === "deposit" &&
      p.status === "successful" &&
      outcome.status === "failed"
    )
      return false;
    transition(p.status, outcome.status, p.kind);
    await ensureWallet(c, p.user_id);
    const amount = BigInt(p.amount),
      fee = BigInt(p.fee),
      total = amount + fee;
    if (p.kind === "deposit" && outcome.status === "successful")
      await postJournal(c, `deposit:${id}`, "Verified wallet deposit", [
        { account: "platform:clearing", amount: -amount },
        { account: `${p.user_id}:available`, amount },
      ]);
    else if (
      p.kind === "deposit" &&
      outcome.status === "reversed" &&
      p.status === "successful"
    ) {
      // Track a recoverable debt if the original deposit has already been spent.
      const {
        rows: [wallet],
      } = await c.query(
        "SELECT balance FROM ledger_accounts WHERE id=$1 FOR UPDATE",
        [`${p.user_id}:available`],
      );
      const available = BigInt(wallet.balance),
        recover = available < amount ? available : amount;
      await postJournal(
        c,
        `reverse-deposit:${id}`,
        "Verified deposit reversal",
        [
          ...(recover
            ? [{ account: `${p.user_id}:available`, amount: -recover }]
            : []),
          ...(amount > recover
            ? [{ account: `${p.user_id}:debt`, amount: -(amount - recover) }]
            : []),
          { account: "platform:clearing", amount },
        ],
      );
    } else if (p.kind !== "deposit" && outcome.status === "successful")
      await postJournal(c, `settle:${id}`, "Verified payment settlement", [
        { account: `${p.user_id}:reserved`, amount: -total },
        { account: "platform:clearing", amount },
        ...(fee ? [{ account: "platform:revenue", amount: fee }] : []),
      ]);
    else if (p.kind !== "deposit" && outcome.status === "failed")
      await postJournal(
        c,
        `release:${id}`,
        "Release failed payment reservation",
        [
          { account: `${p.user_id}:reserved`, amount: -total },
          { account: `${p.user_id}:available`, amount: total },
        ],
      );
    else if (
      p.kind !== "deposit" &&
      outcome.status === "reversed" &&
      p.status === "processing"
    )
      await postJournal(
        c,
        `release-reversed:${id}`,
        "Release a provider-reversed reservation",
        [
          { account: `${p.user_id}:reserved`, amount: -total },
          { account: `${p.user_id}:available`, amount: total },
        ],
      );
    else if (p.kind !== "deposit" && outcome.status === "reversed")
      await postJournal(
        c,
        `refund:${id}`,
        "Compensating verified payment reversal",
        [
          { account: "platform:clearing", amount: -amount },
          ...(fee ? [{ account: "platform:revenue", amount: -fee }] : []),
          { account: `${p.user_id}:available`, amount: total },
        ],
      );
    await c.query(
      "UPDATE transactions SET status=$2,details=details||$3::jsonb,updated_at=now() WHERE id=$1",
      [
        id,
        outcome.status,
        JSON.stringify(
          outcome.fulfillment ? { fulfillment: outcome.fulfillment } : {},
        ),
      ],
    );
    if (outcome.status === "successful")
      await awardRewards(c, { ...p, status: "successful" });
    if (outcome.status === "reversed") await reverseRewards(c, id);
    await c.query(
      "INSERT INTO notifications(id,user_id,title,body) VALUES($1,$2,$3,$4)",
      [
        crypto.randomUUID(),
        p.user_id,
        `Payment ${outcome.status}`,
        `Your ${p.kind.replaceAll("_", " ")} is ${outcome.status}. Open your transaction for details.`,
      ],
    );
    await enqueue(c, "receipt", { id }, `receipt:${id}:${outcome.status}`);
    await queueUserEmail(
      c,
      p.user_id,
      `Transaction ${outcome.status}`,
      `Your ${p.kind} of ${formatMoney(p.amount)} is ${outcome.status}.
Reference: ${p.reference}
Fee: ${formatMoney(p.fee)}
Open the app for your receipt and full details:
${env().WEB_ORIGIN}/transactions/detail?id=${id}`,
      `transaction-email:${id}:${outcome.status}`,
    );
    return true;
  });
}
