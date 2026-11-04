import { atomic, pool } from "@quickpay/database";
import { rewardRuleSchema, ruleSummary } from "@quickpay/contracts";
import { authorized } from "../../../../shared/auth";
import { body, json } from "../../../../shared/infrastructure/http";
import { assert } from "../../../../shared/errors";
import { audit } from "../services/audit";
export async function rewardRules(req: Request) {
  const s = await authorized(
    req,
    req.method === "GET" ? "rewards.read" : "rewards.write",
  );
  if (req.method === "GET")
    return json({
      rules: (
        await pool.query(
          "SELECT * FROM reward_rules ORDER BY version DESC LIMIT 100",
        )
      ).rows,
    });
  const rule = await body(req, rewardRuleSchema);
  assert(
    new Date(rule.effectiveAt) >= new Date(Date.now() - 60000),
    "EFFECTIVE_DATE",
    "Choose an effective date in the present or future.",
  );
  const row = await atomic(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(74003)");
    const latest = (
      await c.query("SELECT * FROM reward_rules ORDER BY version DESC LIMIT 1")
    ).rows[0];
    assert(
      !latest ||
        new Date(rule.effectiveAt) >= new Date(latest.rule.effectiveAt),
      "SCHEDULE_CONFLICT",
      "A later rule is already scheduled. Choose an effective date after that rule.",
      409,
    );
    const id = crypto.randomUUID(),
      version = (latest?.version || 0) + 1;
    await c.query(
      "INSERT INTO reward_rules(id,version,rule,created_by) VALUES($1,$2,$3,$4)",
      [id, version, JSON.stringify(rule), s.user.id],
    );
    await audit(c, s.user.id, "reward_rule.created", id, latest?.rule || null, {
      rule,
      version,
    });
    return { id, version };
  });
  return json({ ...row, summary: ruleSummary(rule) }, 201);
}
