import { atomic, pool } from "@quickpay/database";
import { ruleSummary, rewardRuleSchema } from "@quickpay/contracts";
import { transactionPin } from "@quickpay/contracts";
import { z } from "zod";
import { identity, authorizeMoney } from "../../../../shared/auth";
import { json, body } from "../../../../shared/infrastructure/http";
import { assert } from "../../../../shared/errors";
import { postJournal, ensureWallet } from "../../ledger/services/post-journal";
export async function activeRule() {
  const {
    rows: [row],
  } = await pool.query(
    "SELECT * FROM reward_rules WHERE (rule->>'effectiveAt')::timestamptz<=now() ORDER BY version DESC LIMIT 1",
  );
  if (!row)
    return json({
      rule: null,
      summary: "No referral campaign is active. Check back for new rewards.",
    });
  const rule = rewardRuleSchema.parse(row.rule);
  const active =
    rule.enabled &&
    new Date(rule.startsAt) <= new Date() &&
    (!rule.endsAt || new Date(rule.endsAt) > new Date());
  return json({
    rule: active ? rule : null,
    version: row.version,
    summary: active
      ? ruleSummary(rule)
      : "No referral campaign is active. Check back for new rewards.",
  });
}
export async function referrals(req: Request) {
  const s = await identity(req);
  const {
    rows: [u],
  } = await pool.query("SELECT referral_code FROM users WHERE id=$1", [
    s.user.id,
  ]);
  const rewards = await pool.query(
    "SELECT rewards.*,reward_rules.version,reward_rules.rule FROM rewards JOIN reward_rules ON reward_rules.id=rewards.rule_id WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
    [s.user.id],
  );
  const count = await pool.query(
    "SELECT count(*) FROM users WHERE invited_by=$1",
    [s.user.id],
  );
  return json({
    code: u.referral_code,
    invited: count.rows[0].count,
    rewards: rewards.rows.map(({ rule, ...r }) => ({
      ...r,
      summary: ruleSummary(rewardRuleSchema.parse(rule)),
      claimable: rule.claimable,
      withdrawable: rule.withdrawable,
    })),
  });
}
export async function claimReward(req: Request, id: string) {
  const v = await body(req, z.object({ pin: transactionPin }));
  const s = await authorizeMoney(req, v.pin);
  await atomic(async (c) => {
    const {
      rows: [r],
    } = await c.query(
      "SELECT rewards.*,reward_rules.rule FROM rewards JOIN reward_rules ON reward_rules.id=rewards.rule_id WHERE rewards.id=$1 AND user_id=$2 FOR UPDATE OF rewards",
      [id, s.user.id],
    );
    assert(r, "NOT_FOUND", "We could not find that reward.", 404);
    if (r.status === "claimed") return;
    assert(
      r.status === "available" && r.rule.claimable && r.rule.withdrawable,
      "REWARD_UNAVAILABLE",
      "This reward cannot be moved to your wallet yet.",
      409,
    );
    await ensureWallet(c, s.user.id);
    const debt = await c.query(
      "SELECT balance FROM ledger_accounts WHERE id=$1 FOR UPDATE",
      [`${s.user.id}:reward_debt`],
    );
    assert(
      BigInt(debt.rows[0].balance) === 0n,
      "REWARD_REVIEW",
      "Please contact support about your reward balance.",
      409,
    );
    await postJournal(c, `claim:${id}`, "Claim eligible referral reward", [
      { account: `${s.user.id}:rewards`, amount: -BigInt(r.amount) },
      { account: `${s.user.id}:available`, amount: BigInt(r.amount) },
    ]);
    await c.query("UPDATE rewards SET status='claimed' WHERE id=$1", [id]);
  });
  return json({ message: "Your reward is now in your wallet." });
}
