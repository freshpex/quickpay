import { z } from "zod";
import { pool } from "@quickpay/database";
import { assert } from "../../../../shared/errors";
import { identity } from "../../../../shared/auth";
import { body, json, rateLimit } from "../../../../shared/infrastructure/http";
import { hash } from "../../../../shared/infrastructure/security";
import {
  paystack,
  resolvedBankAccountSchema,
} from "../../deposits/providers/paystack";
export async function banks(req: Request) {
  await identity(req);
  const banks: { name: string; code: string }[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    const entries = await paystack(
      `bank?country=nigeria&currency=NGN&perPage=100&page=${page}`,
      z.array(z.object({ name: z.string(), code: z.string() })),
    );
    const fresh = entries.filter((bank) => !seen.has(bank.code));
    for (const bank of fresh) {
      banks.push(bank);
      seen.add(bank.code);
    }
    if (entries.length < 100 || fresh.length === 0) break;
  }
  banks.sort((a, b) => a.name.localeCompare(b.name));
  return json({ banks });
}
export async function resolveBank(req: Request) {
  const s = await identity(req);
  await rateLimit(`bank:${s.user.id}`, 10);
  const v = await body(
    req,
    z.object({
      accountNumber: z.string().regex(/^\d{10}$/),
      bankCode: z.string().regex(/^\d{3,6}$/),
    }),
  );
  const result = await paystack(
    `bank/resolve?account_number=${v.accountNumber}&bank_code=${v.bankCode}`,
    resolvedBankAccountSchema,
  );
  assert(
    result.account_number === v.accountNumber,
    "ACCOUNT_MISMATCH",
    "The bank returned a different account. Please verify your details again.",
    422,
  );
  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO beneficiary_validations(id,user_id,kind,destination_hash,result,expires_at) VALUES($1,$2,'bank',$3,$4,now()+interval '10 minutes')",
    [id, s.user.id, hash(v), JSON.stringify({ name: result.account_name })],
  );
  return json({ id, name: result.account_name });
}
