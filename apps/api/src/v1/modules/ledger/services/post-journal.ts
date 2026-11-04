import type { Connection } from "@quickpay/database";
import { assert } from "../../../../shared/errors";
export async function ensureWallet(
  c: Pick<Connection, "query">,
  userId: string,
) {
  for (const bucket of [
    "available",
    "reserved",
    "rewards",
    "reward_debt",
    "debt",
  ])
    await c.query(
      "INSERT INTO ledger_accounts(id,user_id,bucket,allow_negative) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [
        `${userId}:${bucket}`,
        userId,
        bucket,
        ["reward_debt", "debt"].includes(bucket),
      ],
    );
}
export async function postJournal(
  c: Connection,
  reference: string,
  reason: string,
  entries: { account: string; amount: bigint }[],
) {
  assert(
    entries.length >= 2 &&
      entries.reduce((s, e) => s + e.amount, 0n) === 0n &&
      entries.every((e) => e.amount !== 0n),
    "UNBALANCED",
    "This payment could not be recorded.",
  );
  const existing = await c.query("SELECT id FROM journals WHERE reference=$1", [
    reference,
  ]);
  if (existing.rowCount) return false;
  const ids = [...new Set(entries.map((e) => e.account))].sort();
  const locked = await c.query(
    "SELECT id,balance,allow_negative FROM ledger_accounts WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE",
    [ids],
  );
  assert(
    locked.rowCount === ids.length,
    "ACCOUNT_MISSING",
    "Your wallet is not ready yet.",
  );
  // Account locks serialize scoped journal retries as well as concurrent spends.
  if (
    (await c.query("SELECT 1 FROM journals WHERE reference=$1", [reference]))
      .rowCount
  )
    return false;
  for (const a of locked.rows) {
    const delta = entries
      .filter((e) => e.account === a.id)
      .reduce((n, e) => n + e.amount, 0n);
    assert(
      a.allow_negative || BigInt(a.balance) + delta >= 0n,
      "INSUFFICIENT_FUNDS",
      "You do not have enough money in your wallet.",
      409,
    );
  }
  const id = crypto.randomUUID();
  await c.query("INSERT INTO journals(id,reference,reason) VALUES($1,$2,$3)", [
    id,
    reference,
    reason,
  ]);
  for (const e of entries)
    await c.query(
      "INSERT INTO ledger_entries(journal_id,account_id,amount) VALUES($1,$2,$3)",
      [id, e.account, e.amount.toString()],
    );
  return true;
}
