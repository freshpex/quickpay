import { z } from "zod";
import { atomic, pool, enqueue } from "@quickpay/database";
import { authorized } from "../../../../shared/auth";
import { json, body } from "../../../../shared/infrastructure/http";
import { assert } from "../../../../shared/errors";
import { audit } from "../services/audit";
import { ensureWallet, postJournal } from "../../ledger/services/post-journal";
import {
  publicTransaction,
  type PaymentRow,
} from "../../payments/repositories/payment.repository";
import { vtpassConfigured } from "../../billers/providers/vtpass";
const lists: Record<string, { permission: string; sql: string }> = {
  users: {
    permission: "users.read",
    sql: "SELECT u.id,u.name,u.email,u.email_verified,u.phone_verified,u.role,u.created_at,coalesce(h.active,false) referral_hold FROM users u LEFT JOIN referral_holds h ON h.user_id=u.id ORDER BY u.created_at DESC LIMIT 100",
  },
  transactions: {
    permission: "transactions.read",
    sql: "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100",
  },
  catalog: {
    permission: "catalog.read",
    sql: "SELECT * FROM service_catalog ORDER BY category,name",
  },
  gifts: {
    permission: "gift.review",
    sql: "SELECT s.*,q.amount,q.units,p.brand,p.region,e.status evidence_status FROM gift_sales s JOIN gift_quotes q ON q.id=s.quote_id JOIN gift_products p ON p.id=q.product_id JOIN evidence e ON e.id=s.evidence_id ORDER BY s.created_at DESC LIMIT 100",
  },
  "gift-products": {
    permission: "gift.configure",
    sql: "SELECT * FROM gift_products ORDER BY brand",
  },
  support: {
    permission: "support.read",
    sql: "SELECT * FROM support_requests ORDER BY created_at DESC LIMIT 100",
  },
  audit: {
    permission: "audit.read",
    sql: "SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 100",
  },
  operations: {
    permission: "operations.read",
    sql: "SELECT id,type,status,attempts,last_error,created_at FROM jobs WHERE status='failed' OR (status='running' AND lease_until<now()) ORDER BY created_at DESC LIMIT 100",
  },
  exchanges: {
    permission: "exchanges.read",
    sql: "SELECT * FROM exchange_pairs ORDER BY id",
  },
};
export async function adminList(req: Request, resource: string) {
  const config = lists[resource];
  assert(config, "NOT_FOUND", "This admin view does not exist.", 404);
  await authorized(req, config.permission);
  const r = await pool.query(config.sql);
  return json({
    items:
      resource === "transactions"
        ? r.rows.map((v) => publicTransaction(v as PaymentRow))
        : r.rows,
  });
}
export async function adminUpdate(req: Request, resource: string) {
  if (resource === "transactions") {
    const s = await authorized(req, "operations.write");
    const v = await body(
      req,
      z.object({ id: z.string().uuid(), reason: z.string().min(10) }),
    );
    const p = (
      await pool.query("SELECT reference FROM transactions WHERE id=$1", [v.id])
    ).rows[0];
    assert(p, "NOT_FOUND", "Transaction not found.", 404);
    await atomic(async (c) => {
      await enqueue(
        c,
        "verify-provider",
        { reference: p.reference },
        `admin-reconcile:${v.id}:${Math.floor(Date.now() / 60000)}`,
      );
      await audit(
        c,
        s.user.id,
        "transaction.reconciliation_requested",
        v.id,
        null,
        v,
      );
    });
    return json({ message: "Provider reconciliation queued." });
  }
  if (resource === "users") {
    const s = await authorized(req, "users.write");
    const v = await body(
      req,
      z.object({
        id: z.string(),
        referralHold: z.boolean(),
        reason: z.string().min(10),
      }),
    );
    await atomic(async (c) => {
      assert(
        (await c.query("SELECT 1 FROM users WHERE id=$1", [v.id])).rowCount,
        "NOT_FOUND",
        "User not found.",
        404,
      );
      const before = (
        await c.query("SELECT * FROM referral_holds WHERE user_id=$1", [v.id])
      ).rows[0];
      await c.query(
        "INSERT INTO referral_holds(user_id,active,reason,actor_id) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET active=excluded.active,reason=excluded.reason,actor_id=excluded.actor_id,updated_at=now()",
        [v.id, v.referralHold, v.reason, s.user.id],
      );
      await audit(c, s.user.id, "referral_hold.updated", v.id, before, v);
    });
    return json({ message: "Referral activity hold saved." });
  }
  if (resource === "catalog") {
    const s = await authorized(req, "catalog.write");
    const v = await body(
      req,
      z.object({
        id: z.string(),
        enabled: z.boolean(),
        fee: z.string().regex(/^\d+$/),
        min: z.string().regex(/^[1-9]\d*$/),
        max: z.string().regex(/^[1-9]\d*$/),
        reason: z.string().min(10).max(300),
      }),
    );
    assert(
      BigInt(v.max) >= BigInt(v.min),
      "LIMITS_INVALID",
      "Maximum must be greater than minimum.",
    );
    assert(
      !v.enabled || vtpassConfigured(),
      "PROVIDER_UNCONFIGURED",
      "Configure this provider before enabling a service.",
      409,
    );
    await atomic(async (c) => {
      const before = (
        await c.query("SELECT * FROM service_catalog WHERE id=$1 FOR UPDATE", [
          v.id,
        ])
      ).rows[0];
      assert(before, "NOT_FOUND", "Service not found.", 404);
      await c.query(
        "UPDATE service_catalog SET enabled=$2,fee=$3,min=$4,max=$5 WHERE id=$1",
        [v.id, v.enabled, v.fee, v.min, v.max],
      );
      await audit(c, s.user.id, "catalog.updated", v.id, before, v);
    });
    return json({ message: "Service settings saved." });
  }
  if (resource === "support") {
    const s = await authorized(req, "support.write");
    const v = await body(
      req,
      z.object({
        id: z.string().uuid(),
        response: z.string().trim().min(5).max(3000),
        status: z.enum(["open", "resolved"]),
      }),
    );
    await atomic(async (c) => {
      const {
        rows: [row],
      } = await c.query(
        "UPDATE support_requests SET response=$2,status=$3 WHERE id=$1 RETURNING user_id",
        [v.id, v.response, v.status],
      );
      assert(row, "NOT_FOUND", "Support request not found.", 404);
      await c.query(
        "INSERT INTO notifications(id,user_id,title,body) VALUES($1,$2,$3,$4)",
        [crypto.randomUUID(), row.user_id, "Support has replied", v.response],
      );
      await audit(c, s.user.id, "support.replied", v.id, null, v);
    });
    return json({ message: "Reply saved." });
  }
  if (resource === "operations") {
    const s = await authorized(req, "operations.write");
    const v = await body(
      req,
      z.object({ id: z.string().uuid(), reason: z.string().min(10) }),
    );
    await atomic(async (c) => {
      const job = (
        await c.query(
          "SELECT * FROM jobs WHERE id=$1 AND status='failed' FOR UPDATE",
          [v.id],
        )
      ).rows[0];
      assert(job, "NOT_FOUND", "Failed job not found.", 404);
      await c.query(
        "UPDATE jobs SET status='queued',attempts=0,run_at=now() WHERE id=$1",
        [v.id],
      );
      await audit(c, s.user.id, "job.retried", v.id, { status: "failed" }, v);
    });
    return json({ message: "Job queued." });
  }
  if (resource === "gifts") return reviewGift(req);
  if (resource === "gift-products") {
    const s = await authorized(req, "gift.configure");
    const v = await body(
      req,
      z.object({
        id: z.string(),
        enabled: z.boolean(),
        sellEnabled: z.boolean(),
        rateKobo: z.string().regex(/^[1-9]\d*$/),
        minUnits: z.string().regex(/^[1-9]\d*$/),
        maxUnits: z.string().regex(/^[1-9]\d*$/),
        reason: z.string().min(10),
      }),
    );
    assert(
      BigInt(v.maxUnits) >= BigInt(v.minUnits),
      "INVALID_LIMITS",
      "Check card limits.",
    );
    await atomic(async (c) => {
      const old = (
        await c.query("SELECT * FROM gift_products WHERE id=$1 FOR UPDATE", [
          v.id,
        ])
      ).rows[0];
      assert(old, "NOT_FOUND", "Product not found.", 404);
      await c.query(
        "UPDATE gift_products SET enabled=$2,sell_enabled=$3,rate_kobo=$4,min_units=$5,max_units=$6,version=version+1 WHERE id=$1",
        [v.id, v.enabled, v.sellEnabled, v.rateKobo, v.minUnits, v.maxUnits],
      );
      await audit(c, s.user.id, "gift_product.updated", v.id, old, v);
    });
    return json({ message: "Gift-card settings saved." });
  }
  throw new Error("Unsupported admin mutation");
}
async function reviewGift(req: Request) {
  const v = await body(
    req,
    z.object({
      id: z.string().uuid(),
      action: z.enum(["clean", "approve", "reject", "settle"]),
      reason: z.string().min(10).max(1000),
      settlementReference: z.string().min(8).max(120).optional(),
    }),
  );
  const s = await authorized(
    req,
    v.action === "settle"
      ? "gift.settle"
      : v.action === "clean"
        ? "evidence.scan"
        : "gift.review",
  );
  await atomic(async (c) => {
    const {
      rows: [sale],
    } = await c.query(
      "SELECT s.*,q.amount,e.status evidence_status FROM gift_sales s JOIN gift_quotes q ON q.id=s.quote_id JOIN evidence e ON e.id=s.evidence_id WHERE s.id=$1 FOR UPDATE OF s",
      [v.id],
    );
    assert(sale, "NOT_FOUND", "Sale not found.", 404);
    assert(
      sale.user_id !== s.user.id,
      "SELF_REVIEW",
      "You cannot review your own gift-card sale.",
      403,
    );
    if (v.action === "clean") {
      await c.query("UPDATE evidence SET status='clean' WHERE id=$1", [
        sale.evidence_id,
      ]);
    } else if (v.action === "approve") {
      assert(
        sale.status === "review" && sale.evidence_status === "clean",
        "REVIEW_REQUIRED",
        "Complete the evidence safety and card-value checks first.",
        409,
      );
      await c.query(
        "UPDATE gift_sales SET status='approved',reason=$2,reviewed_by=$3 WHERE id=$1",
        [v.id, v.reason, s.user.id],
      );
    } else if (v.action === "reject") {
      assert(
        sale.status === "review",
        "STATE_CONFLICT",
        "This sale has already been reviewed.",
        409,
      );
      await c.query(
        "UPDATE gift_sales SET status='rejected',reason=$2,reviewed_by=$3 WHERE id=$1",
        [v.id, v.reason, s.user.id],
      );
    } else {
      assert(
        sale.status === "approved" &&
          sale.reviewed_by !== s.user.id &&
          v.settlementReference,
        "SECOND_REVIEW_REQUIRED",
        "A different authorized administrator must confirm settlement with a verification reference.",
        409,
      );
      await ensureWallet(c, sale.user_id);
      await postJournal(
        c,
        `gift-sale:${v.id}`,
        `Verified gift-card settlement: ${v.reason}`,
        [
          { account: "platform:clearing", amount: -BigInt(sale.amount) },
          { account: `${sale.user_id}:available`, amount: BigInt(sale.amount) },
        ],
      );
      await c.query(
        "UPDATE gift_sales SET status='paid',settlement_reference=$2 WHERE id=$1",
        [v.id, v.settlementReference],
      );
    }
    await audit(
      c,
      s.user.id,
      `gift_sale.${v.action}`,
      v.id,
      { status: sale.status },
      { ...v },
    );
    await enqueue(
      c,
      "receipt",
      { saleId: v.id },
      `sale-notice:${v.id}:${v.action}`,
    );
  });
  return json({ message: "Gift-card review saved." });
}
