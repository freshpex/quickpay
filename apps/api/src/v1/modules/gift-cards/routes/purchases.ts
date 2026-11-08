import { z } from "zod";
import { atomic, pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { body, json, rateLimit } from "../../../../shared/infrastructure/http";
import { env } from "../../../../shared/infrastructure/env";
import { assert } from "../../../../shared/errors";

export async function purchases(req: Request) {
  const session = await identity(req);
  assert(
    env().PAYMENT_MODE === "sandbox",
    "GIFT_PURCHASE_UNAVAILABLE",
    "Gift-card buying is not available yet. Please check back.",
    503,
  );
  if (req.method === "GET") {
    const products = await pool.query(
      "SELECT * FROM gift_products WHERE sandbox_only=true AND enabled=true AND buy_enabled=true ORDER BY brand",
    );
    const history = await pool.query(
      "SELECT b.*,p.brand FROM sandbox_gift_purchases b JOIN gift_products p ON p.id=b.product_id WHERE b.user_id=$1 AND b.status='successful' ORDER BY b.created_at DESC LIMIT 100",
      [session.user.id],
    );
    return json({ products: products.rows, purchases: history.rows });
  }
  await rateLimit(`gift-buy:${session.user.id}`, 20);
  const value = await body(
    req,
    z.discriminatedUnion("action", [
      z.object({
        action: z.literal("quote"),
        productId: z.string(),
        units: z.string().regex(/^[1-9]\d{0,5}$/),
      }),
      z.object({ action: z.literal("confirm"), quoteId: z.string().uuid() }),
    ]),
  );
  const purchase = await atomic(async (client) => {
    if (value.action === "quote") {
      const {
        rows: [product],
      } = await client.query(
        "SELECT * FROM gift_products WHERE id=$1 AND sandbox_only=true AND enabled=true AND buy_enabled=true",
        [value.productId],
      );
      assert(
        product,
        "GIFT_UNAVAILABLE",
        "Choose an available sandbox card.",
        400,
      );
      const units = BigInt(value.units);
      assert(
        units >= BigInt(product.min_units) &&
          units <= BigInt(product.max_units),
        "QUOTE_LIMIT",
        "Choose a value within the card limits.",
      );
      const {
        rows: [quote],
      } = await client.query(
        "INSERT INTO sandbox_gift_purchases(id,user_id,product_id,units,amount,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes') RETURNING *",
        [
          crypto.randomUUID(),
          session.user.id,
          product.id,
          value.units,
          (units * BigInt(product.rate_kobo)).toString(),
        ],
      );
      return quote;
    }
    const {
      rows: [quote],
    } = await client.query(
      "SELECT * FROM sandbox_gift_purchases WHERE id=$1 AND user_id=$2 FOR UPDATE",
      [value.quoteId, session.user.id],
    );
    assert(quote, "NOT_FOUND", "Purchase quote not found.", 404);
    if (quote.status === "successful") return quote;
    assert(
      new Date(quote.expires_at) > new Date(),
      "QUOTE_EXPIRED",
      "Your quote expired. Request a new quote.",
      409,
    );
    const {
      rows: [completed],
    } = await client.query(
      "UPDATE sandbox_gift_purchases SET status='successful' WHERE id=$1 RETURNING *",
      [quote.id],
    );
    return completed;
  });
  return json({
    purchase,
    demoCode:
      purchase.status === "successful"
        ? `DEMO-NOT-REDEEMABLE-${purchase.id}`
        : null,
  });
}
