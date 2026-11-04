import { atomic, enqueue, pool } from "@quickpay/database";
import { z } from "zod";
import {
  paymentSchema,
  withdrawalSchema,
  depositSchema,
} from "@quickpay/contracts";
import { authorizeMoney, identity } from "../../../../shared/auth";
import { body, json } from "../../../../shared/infrastructure/http";
import { hash, seal } from "../../../../shared/infrastructure/security";
import { assert } from "../../../../shared/errors";
import {
  idempotent,
  publicTransaction,
  type PaymentRow,
} from "../repositories/payment.repository";
import { ensureWallet, postJournal } from "../../ledger/services/post-journal";
import {
  vtpass,
  vtpassConfigured,
  vtReference,
  variationSchema,
} from "../../billers/providers/vtpass";
import { paystackConfigured } from "../../deposits/providers/paystack";
import { env } from "../../../../shared/infrastructure/env";
import { parseNaira, phone } from "@quickpay/contracts";
import { walletLimits } from "../../wallets/domain/limits";
export async function createOperation(
  req: Request,
  kind: "payment" | "withdrawal" | "deposit",
) {
  const raw = await body(req, z.record(z.string(), z.unknown()));
  const v =
    kind === "payment"
      ? { ...paymentSchema.parse(raw), kind: "payment" as const }
      : kind === "withdrawal"
        ? { ...withdrawalSchema.parse(raw), kind: "withdrawal" as const }
        : { ...depositSchema.parse(raw), kind: "deposit" as const };
  const s =
    v.kind === "deposit"
      ? await identity(req)
      : await authorizeMoney(req, v.password);
  assert(
    s.user.emailVerified,
    "VERIFY_CONTACT",
    "Verify your email before adding money.",
    403,
  );
  const key = req.headers.get("Idempotency-Key");
  assert(
    key && /^[a-zA-Z0-9_-]{16,100}$/.test(key),
    "IDEMPOTENCY_REQUIRED",
    "Please submit this request with a valid reference.",
  );
  const clean = Object.fromEntries(
    Object.entries(v).filter(([k]) => k !== "password"),
  );
  const requestHash = hash({ kind, ...clean });
  // Replay before provider reads so retries remain useful during provider outages.
  const old = await pool.query<PaymentRow>(
    "SELECT * FROM transactions WHERE user_id=$1 AND idempotency_key=$2",
    [s.user.id, key],
  );
  if (old.rowCount) {
    assert(
      old.rows[0].request_hash === requestHash,
      "IDEMPOTENCY_CONFLICT",
      "This request reference was already used for different details.",
      409,
    );
    return json({ transaction: publicTransaction(old.rows[0]) });
  }
  let fee = 0n;
  const details: Record<string, unknown> = {};
  const provider = kind === "payment" ? "vtpass" : "paystack";
  const reference =
    kind === "payment"
      ? vtReference()
      : `qp_${crypto.randomUUID().replaceAll("-", "")}`;
  if (kind === "deposit") {
    assert(
      paystackConfigured(),
      "DEPOSIT_UNAVAILABLE",
      "Adding money is not available yet. Please check back.",
      503,
    );
    assert(
      BigInt(v.amount) >= BigInt(walletLimits.minimum) && BigInt(v.amount) <= BigInt(walletLimits.maximum),
      "LIMIT",
      "Add between ₦100 and ₦1,000,000.",
    );
  }
  if (v.kind === "payment") {
    assert(
      vtpassConfigured(),
      "SERVICE_UNAVAILABLE",
      "This service is not available yet.",
      503,
    );
    const r = await pool.query(
      "SELECT * FROM service_catalog WHERE id=$1 AND enabled=true",
      [v.serviceId],
    );
    const service = r.rows[0];
    assert(
      service,
      "SERVICE_UNAVAILABLE",
      "This service is not available yet.",
      503,
    );
    assert(
      BigInt(v.amount) >= BigInt(service.min) &&
        BigInt(v.amount) <= BigInt(service.max),
      "LIMIT",
      "Choose an amount within the service limits.",
    );
    assert(
      BigInt(v.amount) % 100n === 0n,
      "WHOLE_NAIRA_REQUIRED",
      "Choose a whole naira amount.",
    );
    fee = BigInt(service.fee);
    if (["airtime", "data"].includes(service.category)) {
      const normalized = phone.parse(v.beneficiary);
      v.beneficiary = `0${normalized.slice(4)}`;
    }
    Object.assign(details, {
      beneficiary: v.beneficiary,
      phone: v.phone ? `0${v.phone.slice(4)}` : undefined,
      plan: v.plan,
      category: service.category,
    });
    if (service.requires_validation) {
      assert(
        v.validationId,
        "VALIDATE_FIRST",
        "Check the recipient before paying.",
      );
      const valid = await pool.query(
        "SELECT * FROM beneficiary_validations WHERE id=$1 AND user_id=$2 AND kind='bill' AND expires_at>now()",
        [v.validationId, s.user.id],
      );
      assert(
        valid.rowCount,
        "VALIDATE_FIRST",
        "Check the recipient again before paying.",
      );
      const result = valid.rows[0].result;
      assert(
        valid.rows[0].destination_hash ===
          hash({
            serviceId: v.serviceId,
            beneficiary: v.beneficiary,
            ...(result.type ? { type: result.type } : {}),
          }),
        "DESTINATION_CHANGED",
        "Check the recipient again.",
      );
      details.beneficiaryName = result.name;
      details.type = result.type;
    }
    if (v.plan) {
      const catalog = variationSchema.parse(
        (
          await vtpass(
            `service-variations?serviceID=${encodeURIComponent(v.serviceId)}`,
            "GET",
          )
        ).content,
      );
      const plan = catalog.variations.find((p) => p.variation_code === v.plan);
      assert(
        plan && parseNaira(String(plan.variation_amount)) === v.amount,
        "PLAN_CHANGED",
        "This plan changed. Choose it again before paying.",
      );
    } else
      assert(
        !["data", "television", "education"].includes(service.category),
        "PLAN_REQUIRED",
        "Choose a plan before paying.",
      );
  }
  if (v.kind === "withdrawal") {
    assert(
      paystackConfigured() && env().PAYSTACK_TRANSFERS_ENABLED === "true",
      "WITHDRAWAL_UNAVAILABLE",
      "Bank withdrawals are not available yet.",
      503,
    );
    assert(
      BigInt(v.amount) >= BigInt(walletLimits.minimum) && BigInt(v.amount) <= BigInt(walletLimits.maximum),
      "LIMIT",
      "Withdraw between ₦100 and ₦1,000,000.",
    );
    const valid = await pool.query(
      "SELECT * FROM beneficiary_validations WHERE id=$1 AND user_id=$2 AND kind='bank' AND expires_at>now()",
      [v.validationId, s.user.id],
    );
    assert(
      valid.rowCount &&
        valid.rows[0].destination_hash ===
          hash({ accountNumber: v.accountNumber, bankCode: v.bankCode }),
      "VALIDATE_FIRST",
      "Check the bank account before withdrawing.",
    );
    Object.assign(details, {
      encryptedDestination: seal(
        JSON.stringify({
          accountNumber: v.accountNumber,
          bankCode: v.bankCode,
        }),
      ),
      accountName: valid.rows[0].result.name,
      accountLast4: v.accountNumber.slice(-4),
      bankCode: v.bankCode,
    });
  }
  const transaction = await atomic(async (c) => {
    const existing = await idempotent(c, s.user.id, key, requestHash);
    if (existing) return existing;
    await ensureWallet(c, s.user.id);
    const id = crypto.randomUUID();
    const r = await c.query<PaymentRow>(
      "INSERT INTO transactions(id,user_id,kind,status,amount,fee,reference,provider,service_id,idempotency_key,request_hash,details) VALUES($1,$2,$3,'processing',$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
      [
        id,
        s.user.id,
        kind,
        v.amount,
        fee.toString(),
        reference,
        provider,
        v.kind === "payment" ? v.serviceId : null,
        key,
        requestHash,
        JSON.stringify(details),
      ],
    );
    if (kind !== "deposit") {
      const debt = await c.query(
        "SELECT balance,bucket FROM ledger_accounts WHERE user_id=$1 ORDER BY id FOR UPDATE",
        [s.user.id],
      );
      assert(
        debt.rows
          .filter((a) => ["debt", "reward_debt"].includes(a.bucket))
          .every((a) => BigInt(a.balance) >= 0n),
        "WALLET_REVIEW",
        "Please contact support before making another payment.",
        409,
      );
      const total = BigInt(v.amount) + fee;
      await postJournal(c, `reserve:${id}`, "Reserve payment funds", [
        { account: `${s.user.id}:available`, amount: -total },
        { account: `${s.user.id}:reserved`, amount: total },
      ]);
    }
    await enqueue(c, "process-payment", { id }, `process:${id}`);
    return r.rows[0];
  });
  return json({ transaction: publicTransaction(transaction) }, 202);
}
