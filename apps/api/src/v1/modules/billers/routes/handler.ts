import { pool } from "@quickpay/database";
import { z } from "zod";
import { identity } from "../../../../shared/auth";
import { body, json } from "../../../../shared/infrastructure/http";
import { hash } from "../../../../shared/infrastructure/security";
import { assert } from "../../../../shared/errors";
import { vtpass, vtpassConfigured, variationSchema } from "../providers/vtpass";
import { parseNaira } from "@quickpay/contracts";
export async function listServices() {
  const r = await pool.query(
    "SELECT * FROM service_catalog ORDER BY category,name",
  );
  return json({
    services: r.rows.map((s) => ({
      ...s,
      requiresValidation: s.requires_validation,
      available: s.enabled && vtpassConfigured(),
      reason:
        s.enabled && vtpassConfigured()
          ? undefined
          : "This service is currently unavailable. Please choose another service.",
    })),
  });
}
export async function plans(req: Request, serviceId: string) {
  await identity(req);
  const r = await pool.query(
    "SELECT id,enabled FROM service_catalog WHERE id=$1",
    [serviceId],
  );
  assert(
    r.rows[0]?.enabled,
    "SERVICE_UNAVAILABLE",
    "This service is not available yet.",
    503,
  );
  const data = await vtpass(
    `service-variations?serviceID=${encodeURIComponent(serviceId)}`,
    "GET",
  );
  const parsed = variationSchema.parse(data.content);
  return json({
    plans: parsed.variations.map((v) => ({
      code: v.variation_code,
      name: v.name,
      amount: parseNaira(String(v.variation_amount)),
    })),
  });
}
export async function validateBeneficiary(req: Request) {
  const s = await identity(req);
  const v = await body(
    req,
    z.object({
      serviceId: z.string(),
      beneficiary: z.string().min(3).max(100),
      type: z.enum(["prepaid", "postpaid"]).optional(),
    }),
  );
  const r = await pool.query(
    "SELECT * FROM service_catalog WHERE id=$1 AND enabled=true",
    [v.serviceId],
  );
  assert(
    r.rowCount && vtpassConfigured(),
    "SERVICE_UNAVAILABLE",
    "This service is not available yet.",
    503,
  );
  const result = await vtpass("merchant-verify", "POST", {
    serviceID: v.serviceId,
    billersCode: v.beneficiary,
    type: v.type,
  });
  const content = z
    .object({
      Customer_Name: z.string().optional(),
      Name: z.string().optional(),
    })
    .passthrough()
    .parse(result.content);
  const name = content.Customer_Name || content.Name;
  assert(
    name,
    "INVALID_BENEFICIARY",
    "We could not verify these details. Check them and try again.",
  );
  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO beneficiary_validations(id,user_id,kind,destination_hash,result,expires_at) VALUES($1,$2,'bill',$3,$4,now()+interval '10 minutes')",
    [id, s.user.id, hash(v), JSON.stringify({ name, type: v.type })],
  );
  return json({ id, name });
}
