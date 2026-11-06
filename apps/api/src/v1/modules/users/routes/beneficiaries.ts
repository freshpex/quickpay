import { phone } from "@quickpay/contracts";
import { z } from "zod";
import { pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { body, json } from "../../../../shared/infrastructure/http";
import { assert } from "../../../../shared/errors";
export async function beneficiaries(req: Request) {
  const s = await identity(req);
  if (req.method === "GET")
    return json({
      beneficiaries: (
        await pool.query(
          "SELECT * FROM beneficiaries WHERE user_id=$1 ORDER BY created_at DESC",
          [s.user.id],
        )
      ).rows,
    });
  if (req.method === "DELETE") {
    const v = await body(req, z.object({ id: z.string().uuid() }));
    assert(
      (
        await pool.query(
          "DELETE FROM beneficiaries WHERE id=$1 AND user_id=$2",
          [v.id, s.user.id],
        )
      ).rowCount,
      "NOT_FOUND",
      "We could not find that beneficiary.",
      404,
    );
    return json({ message: "Beneficiary removed." });
  }
  const v = await body(
    req,
    z.object({
      name: z.string().trim().min(2).max(80),
      kind: z.enum(["phone", "bill"]),
      details: z.object({
        account: z.string().min(3).max(100),
        serviceId: z.string().max(100).optional(),
      }),
    }),
  );
  const service = v.details.serviceId
    ? (
        await pool.query("SELECT category FROM service_catalog WHERE id=$1", [
          v.details.serviceId,
        ])
      ).rows[0]
    : null;
  if (v.kind === "phone" || ["airtime", "data"].includes(service?.category)) {
    v.details.account = phone.parse(v.details.account);
    v.kind = "phone";
  }
  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO beneficiaries(id,user_id,name,kind,details) VALUES($1,$2,$3,$4,$5)",
    [id, s.user.id, v.name, v.kind, JSON.stringify(v.details)],
  );
  return json({ id, message: "Beneficiary saved." }, 201);
}
