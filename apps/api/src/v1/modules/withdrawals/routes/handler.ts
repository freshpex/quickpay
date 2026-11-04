import { z } from "zod";
import { pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { body, json, rateLimit } from "../../../../shared/infrastructure/http";
import { hash } from "../../../../shared/infrastructure/security";
import { paystack } from "../../deposits/providers/paystack";
export async function banks(req: Request) {
  await identity(req);
  const banks = await paystack(
    "bank?country=nigeria&currency=NGN",
    z.array(z.object({ name: z.string(), code: z.string() })),
  );
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
    z.object({ account_number: z.string(), account_name: z.string() }),
  );
  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO beneficiary_validations(id,user_id,kind,destination_hash,result,expires_at) VALUES($1,$2,'bank',$3,$4,now()+interval '10 minutes')",
    [id, s.user.id, hash(v), JSON.stringify({ name: result.account_name })],
  );
  return json({ id, name: result.account_name });
}
