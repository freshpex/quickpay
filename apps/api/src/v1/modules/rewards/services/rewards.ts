import { type Connection } from "@quickpay/database";
import { rewardRuleSchema, calculateReward } from "@quickpay/contracts";
import { ensureWallet, postJournal } from "../../ledger/services/post-journal";
import type { PaymentRow } from "../../payments/repositories/payment.repository";
export async function awardRewards(c: Connection, payment: PaymentRow) {
  if (payment.kind !== "payment") return;
  // Serialize campaign and per-user caps, first-payment checks and duplicate delivery.
  await c.query("SELECT pg_advisory_xact_lock(74002)");
  const {
    rows: [u],
  } = await c.query("SELECT invited_by,created_at FROM users WHERE id=$1", [
    payment.user_id,
  ]);
  if (!u?.invited_by || u.invited_by === payment.user_id) return;
  if (
    (
      await c.query(
        "SELECT 1 FROM referral_holds WHERE user_id=ANY($1::text[]) AND active=true",
        [[u.invited_by, payment.user_id]],
      )
    ).rowCount
  )
    return;
  const {
    rows: [row],
  } = await c.query(
    "SELECT * FROM reward_rules WHERE (rule->>'effectiveAt')::timestamptz<=$1 ORDER BY version DESC LIMIT 1",
    [payment.created_at],
  );
  if (!row) return;
  const r = rewardRuleSchema.parse(row.rule);
  const at = new Date(payment.created_at).getTime();
  if (
    !r.enabled ||
    at < new Date(r.startsAt).getTime() ||
    (r.endsAt && at > new Date(r.endsAt).getTime())
  )
    return;
  if (
    !r.categories.includes(
      payment.details.category as (typeof r.categories)[number],
    ) ||
    (r.serviceIds.length && !r.serviceIds.includes(payment.service_id!))
  )
    return;
  if (
    r.frequency === "first" &&
    (
      await c.query(
        "SELECT 1 FROM transactions WHERE user_id=$1 AND kind='payment' AND status IN ('successful','reversed') AND id<>$2 AND (details->>'category')=ANY($3::text[]) AND ($4::text[]='{}' OR service_id=ANY($4::text[])) LIMIT 1",
        [payment.user_id, payment.id, r.categories, r.serviceIds],
      )
    ).rowCount
  )
    return;
  // Revenue-based rewards use the platform's exact fee, never unverified provider commission.
  const amount = calculateReward(
    r,
    BigInt(payment.amount),
    BigInt(payment.fee),
  );
  if (!amount) return;
  const recipients =
    r.recipient === "both"
      ? [u.invited_by, payment.user_id]
      : [r.recipient === "referrer" ? u.invited_by : payment.user_id];
  for (const [index, userId] of recipients.entries()) {
    if (
      (
        await c.query(
          "SELECT 1 FROM rewards WHERE user_id=$1 AND transaction_id=$2",
          [userId, payment.id],
        )
      ).rowCount
    )
      continue;
    const spent = await c.query(
      "SELECT coalesce(sum(amount),0) total,coalesce(sum(amount) FILTER(WHERE user_id=$2),0) person FROM rewards WHERE rule_id=$1",
      [row.id, userId],
    );
    const remaining = BigInt(r.campaignCap) - BigInt(spent.rows[0].total),
      personal = BigInt(r.userCap) - BigInt(spent.rows[0].person);
    // The transaction cap applies to the total pool, shared equally when both parties qualify.
    const allocation =
      amount / BigInt(recipients.length) +
      (index === 0 ? amount % BigInt(recipients.length) : 0n);
    const granted = [allocation, remaining, personal].reduce((a, b) =>
      a < b ? a : b,
    );
    if (granted <= 0n) continue;
    await ensureWallet(c, userId);
    await c.query(
      "INSERT INTO rewards(id,user_id,referred_user_id,transaction_id,rule_id,amount,available_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        crypto.randomUUID(),
        userId,
        payment.user_id,
        payment.id,
        row.id,
        granted.toString(),
        new Date(Date.now() + r.holdingHours * 3600000),
      ],
    );
  }
}
export async function releaseRewards(c: Connection) {
  const r = await c.query(
    "SELECT rewards.* FROM rewards JOIN transactions ON transactions.id=rewards.transaction_id WHERE rewards.status='pending' AND available_at<=now() AND transactions.status='successful' ORDER BY rewards.id FOR UPDATE OF rewards SKIP LOCKED LIMIT 50",
  );
  for (const reward of r.rows) {
    await ensureWallet(c, reward.user_id);
    await postJournal(
      c,
      `reward:${reward.id}`,
      "Release verified referral reward",
      [
        { account: "platform:reward_expense", amount: -BigInt(reward.amount) },
        { account: `${reward.user_id}:rewards`, amount: BigInt(reward.amount) },
      ],
    );
    await c.query("UPDATE rewards SET status='available' WHERE id=$1", [
      reward.id,
    ]);
  }
}
export async function reverseRewards(c: Connection, paymentId: string) {
  const r = await c.query(
    "SELECT * FROM rewards WHERE transaction_id=$1 AND status<>'reversed' ORDER BY id FOR UPDATE",
    [paymentId],
  );
  for (const reward of r.rows) {
    if (reward.status !== "pending") {
      await ensureWallet(c, reward.user_id);
      const bucket = reward.status === "claimed" ? "available" : "rewards";
      const {
        rows: [a],
      } = await c.query(
        "SELECT balance FROM ledger_accounts WHERE id=$1 FOR UPDATE",
        [`${reward.user_id}:${bucket}`],
      );
      const amount = BigInt(reward.amount),
        funds = BigInt(a.balance),
        recoverable = amount < funds ? amount : funds;
      await postJournal(
        c,
        `reverse-reward:${reward.id}`,
        "Compensate reward for reversed payment",
        [
          ...(recoverable
            ? [{ account: `${reward.user_id}:${bucket}`, amount: -recoverable }]
            : []),
          ...(amount > recoverable
            ? [
                {
                  account: `${reward.user_id}:reward_debt`,
                  amount: -(amount - recoverable),
                },
              ]
            : []),
          { account: "platform:reward_expense", amount },
        ],
      );
    }
    await c.query("UPDATE rewards SET status='reversed' WHERE id=$1", [
      reward.id,
    ]);
  }
}
