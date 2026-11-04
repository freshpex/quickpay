import { z } from "zod";
import { atomic, pool } from "@quickpay/database";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { identity, authorized } from "../../../../shared/auth";
import { body, json, rateLimit } from "../../../../shared/infrastructure/http";
import { env } from "../../../../shared/infrastructure/env";
import { seal, unseal } from "../../../../shared/infrastructure/security";
import { assert } from "../../../../shared/errors";
export async function products(req: Request) {
  await identity(req);
  return json({
    products: (
      await pool.query(
        "SELECT * FROM gift_products WHERE enabled=true AND sell_enabled=true ORDER BY brand",
      )
    ).rows,
    buyingAvailable: false,
  });
}
export async function quote(req: Request) {
  const s = await identity(req);
  const v = await body(
    req,
    z.object({
      productId: z.string(),
      units: z.string().regex(/^[1-9]\d{0,5}$/),
    }),
  );
  const {
    rows: [p],
  } = await pool.query(
    "SELECT * FROM gift_products WHERE id=$1 AND enabled=true AND sell_enabled=true",
    [v.productId],
  );
  assert(p, "GIFT_UNAVAILABLE", "This gift card is not available yet.", 503);
  const units = BigInt(v.units);
  assert(
    units >= BigInt(p.min_units) && units <= BigInt(p.max_units),
    "QUOTE_LIMIT",
    "Choose a value within the card limits.",
  );
  const id = crypto.randomUUID(),
    amount = units * BigInt(p.rate_kobo),
    expiresAt = new Date(Date.now() + 10 * 60000);
  await pool.query(
    "INSERT INTO gift_quotes(id,user_id,product_id,product_version,units,amount,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [id, s.user.id, p.id, p.version, v.units, amount.toString(), expiresAt],
  );
  return json({
    id,
    amount,
    expiresAt,
    brand: p.brand,
    region: p.region,
    cardType: p.card_type,
  });
}
export async function upload(req: Request) {
  const s = await identity(req);
  await rateLimit(`upload:${s.user.id}`, 5);
  const length = Number(req.headers.get("content-length"));
  assert(
    length > 0 && length <= 5245000,
    "UPLOAD_SIZE",
    "Choose a JPG or PNG smaller than 5 MB.",
    413,
  );
  const form = await req.formData();
  const file = form.get("file");
  assert(
    file instanceof File &&
      file.size <= 5242880 &&
      ["image/jpeg", "image/png"].includes(file.type),
    "UPLOAD_TYPE",
    "Choose a JPG or PNG smaller than 5 MB.",
  );
  const bytes = Buffer.from(await file.arrayBuffer());
  assert(
    file.type === "image/png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    "UPLOAD_TYPE",
    "This file is not a supported image.",
  );
  const id = crypto.randomUUID(),
    folder = resolve(env().UPLOAD_DIR);
  await mkdir(folder, { recursive: true });
  const path = join(folder, `${id}.enc`);
  await writeFile(path, seal(bytes.toString("base64")), { flag: "wx" });
  await pool.query(
    "INSERT INTO evidence(id,user_id,file_path,mime,size) VALUES($1,$2,$3,$4,$5)",
    [id, s.user.id, path, file.type, file.size],
  );
  return json(
    {
      id,
      status: "quarantined",
      message: "Your evidence has been received for a safety check.",
    },
    201,
  );
}
export async function evidence(req: Request, id: string) {
  const s = await identity(req);
  const {
    rows: [e],
  } = await pool.query("SELECT * FROM evidence WHERE id=$1", [id]);
  assert(e, "NOT_FOUND", "We could not find this file.", 404);
  if (e.user_id !== s.user.id) await authorized(req, "gift.review");
  assert(
    e.status === "clean",
    "EVIDENCE_QUARANTINED",
    "This file is waiting for a safety check.",
    409,
  );
  const bytes = Buffer.from(
    unseal(await readFile(e.file_path, "utf8")),
    "base64",
  );
  return new Response(bytes, {
    headers: {
      "Content-Type": e.mime,
      "Content-Disposition": `attachment; filename="evidence-${id}.${e.mime === "image/png" ? "png" : "jpg"}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function sales(req: Request) {
  const s = await identity(req);
  if (req.method === "GET")
    return json({
      sales: (
        await pool.query(
          "SELECT s.id,s.status,s.reason,s.settlement_reference,s.created_at,q.amount,q.units,p.brand,p.region,p.card_type FROM gift_sales s JOIN gift_quotes q ON q.id=s.quote_id JOIN gift_products p ON p.id=q.product_id WHERE s.user_id=$1 ORDER BY s.created_at DESC LIMIT 100",
          [s.user.id],
        )
      ).rows,
    });
  const v = await body(
    req,
    z.object({ quoteId: z.string().uuid(), evidenceId: z.string().uuid() }),
  );
  assert(
    s.user.emailVerified,
    "VERIFY_CONTACT",
    "Verify your email before selling a gift card.",
    403,
  );
  const id = await atomic(async (c) => {
    const old = await c.query(
      "SELECT id FROM gift_sales WHERE quote_id=$1 AND user_id=$2",
      [v.quoteId, s.user.id],
    );
    if (old.rowCount) return old.rows[0].id;
    const {
      rows: [q],
    } = await c.query(
      "SELECT * FROM gift_quotes WHERE id=$1 AND user_id=$2 FOR UPDATE",
      [v.quoteId, s.user.id],
    );
    assert(
      q && !q.used && new Date(q.expires_at) > new Date(),
      "QUOTE_EXPIRED",
      "Your quote expired. Request a new quote.",
      409,
    );
    assert(
      (
        await c.query("SELECT 1 FROM evidence WHERE id=$1 AND user_id=$2", [
          v.evidenceId,
          s.user.id,
        ])
      ).rowCount,
      "EVIDENCE_REQUIRED",
      "Upload your gift-card evidence first.",
    );
    const id = crypto.randomUUID();
    await c.query(
      "INSERT INTO gift_sales(id,user_id,quote_id,evidence_id) VALUES($1,$2,$3,$4)",
      [id, s.user.id, q.id, v.evidenceId],
    );
    await c.query("UPDATE gift_quotes SET used=true WHERE id=$1", [q.id]);
    return id;
  });
  return json(
    {
      id,
      message:
        "Your card is waiting for review. Payment follows verification and approval.",
    },
    201,
  );
}
