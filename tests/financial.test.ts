import { purchases as giftPurchases } from "../apps/api/src/v1/modules/gift-cards/routes/purchases";
import { products as giftProducts } from "../apps/api/src/v1/modules/gift-cards/routes/handler";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";
import { pool, atomic } from "@quickpay/database";
import { hashPassword } from "better-auth/crypto";
import {
  quote as giftQuote,
  sales as giftSales,
} from "../apps/api/src/v1/modules/gift-cards/routes/handler";
import { adminUpdate } from "../apps/api/src/v1/modules/admin/routes/handler";
import {
  postJournal,
  ensureWallet,
} from "../apps/api/src/v1/modules/ledger/services/post-journal";
import { settlePayment } from "../apps/api/src/v1/modules/payments/services/settle-payment";
import { validPaystackSignature } from "../apps/api/src/v1/modules/deposits/providers/paystack";
import { paystackWebhook } from "../apps/api/src/v1/modules/deposits/routes/webhook";
import {
  idempotent,
  ownPayment,
} from "../apps/api/src/v1/modules/payments/repositories/payment.repository";
import {
  calculateReward,
  rewardRuleSchema,
  parseNaira,
  signUpSchema,
  phone,
  newTransactionPin,
  type RewardRule,
} from "@quickpay/contracts";
import {
  setTransactionPin,
  verifyTransactionPin,
  requestPinReset,
  resetTransactionPin,
} from "../apps/api/src/v1/modules/security/services/pin";
import { pinSettings } from "../apps/api/src/v1/modules/security/routes/pin";
import { prepareDepositCheckout } from "../apps/api/src/v1/modules/deposits/services/checkout";
import { getPayment } from "../apps/api/src/v1/modules/payments/routes/handler";
import { resolveBank } from "../apps/api/src/v1/modules/withdrawals/routes/handler";
import { publicTransaction } from "../apps/api/src/v1/modules/payments/repositories/payment.repository";
import { createOperation } from "../apps/api/src/v1/modules/payments/services/create-payment";
import { verifyAdminEmail } from "../apps/api/src/v1/modules/admin/services/verify-email";
import { auth } from "../apps/api/src/v1/modules/auth/auth";
import { authorized } from "../apps/api/src/shared/auth";
import { endpoint, json } from "../apps/api/src/shared/infrastructure/http";
import { createHmac } from "node:crypto";
import { env } from "../apps/api/src/shared/infrastructure/env";
import { processPayment } from "../apps/api/src/v1/modules/payments/jobs/process-payment";
import type { PaymentRow } from "../apps/api/src/v1/modules/payments/repositories/payment.repository";
import { handleAuth } from "../apps/api/src/v1/modules/auth/routes/handler";
import { releaseRewards } from "../apps/api/src/v1/modules/rewards/services/rewards";
import { claimReward } from "../apps/api/src/v1/modules/rewards/routes/handler";
import { walletCapabilities } from "../apps/api/src/v1/modules/wallets/routes/capabilities";
import { recoverPayment } from "../apps/api/src/v1/modules/payments/routes/recovery";
import {
  devices,
  preferences,
} from "../apps/api/src/v1/modules/notifications/routes/devices";
import {
  deliverPush,
  deliverDevice,
  checkPushReceipt,
} from "../apps/api/src/v1/modules/notifications/jobs/deliver-push";
import {
  upload as uploadEvidence,
  evidence as readEvidence,
} from "../apps/api/src/v1/modules/gift-cards/routes/handler";
import { unseal } from "../apps/api/src/shared/infrastructure/security";
import { bootstrapAdmin } from "../apps/api/src/v1/modules/admin/services/bootstrap";
import { unlockAdmin } from "../apps/api/src/v1/modules/admin/routes/access";
import { rewardRules } from "../apps/api/src/v1/modules/admin/routes/reward-rules";
import {
  sendCode,
  verifyCode,
} from "../apps/api/src/v1/modules/verification/routes/phone";
const ids = {
  user: crypto.randomUUID(),
  other: crypto.randomUUID(),
  referrer: crypto.randomUUID(),
};
const testPassword = "StrongPassword123!";
async function user(id: string, invitedBy?: string) {
  await pool.query(
    "INSERT INTO users(id,name,email,email_verified,phone_number,policy_version,policy_accepted_at,referral_code,invited_by) VALUES($1,'Test Account',$2,true,$3,'test',now(),$4,$5)",
    [
      id,
      `${id}@quickpay.test`,
      `+23480${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, "0")}`,
      id.slice(0, 12),
      invitedBy,
    ],
  );
  await pool.query(
    "INSERT INTO auth_accounts(id,account_id,provider_id,user_id,password) VALUES($1,$2,'credential',$2,$3)",
    [crypto.randomUUID(), id, await hashPassword(testPassword)],
  );
  await atomic((c) => ensureWallet(c, id));
}
async function payment(
  kind: string,
  amount = "10000",
  userId = ids.user,
  status = "processing",
  details: Record<string, unknown> = {},
) {
  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO transactions(id,user_id,kind,status,amount,reference,idempotency_key,request_hash,details) VALUES($1,$2,$3,$4,$5,$1,$1,'hash',$6)",
    [id, userId, kind, status, amount, JSON.stringify(details)],
  );
  return (
    await pool.query<PaymentRow>("SELECT * FROM transactions WHERE id=$1", [id])
  ).rows[0];
}
async function fund(userId: string, amount: bigint) {
  await atomic((c) =>
    postJournal(c, crypto.randomUUID(), "Test funding", [
      { account: "platform:clearing", amount: -amount },
      { account: `${userId}:available`, amount },
    ]),
  );
}
async function balance(userId: string, bucket = "available") {
  return BigInt(
    (
      await pool.query("SELECT balance FROM ledger_accounts WHERE id=$1", [
        `${userId}:${bucket}`,
      ])
    ).rows[0].balance,
  );
}
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Pool({ connectionString: adminUrl.toString() });
  const dbName = url.pathname.slice(1);
  if (
    !(await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [dbName]))
      .rowCount
  ) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*_test$/.test(dbName))
      throw new Error("Unsafe test database name");
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }
  await admin.end();
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  for (const file of (await readdir("packages/database/migrations")).sort())
    await pool.query(
      await readFile(`packages/database/migrations/${file}`, "utf8"),
    );
  await user(ids.referrer);
  await user(ids.user, ids.referrer);
  await user(ids.other);
  for (const id of [ids.user, ids.other, ids.referrer])
    await setTransactionPin(id, "572904");
});
afterAll(() => pool.end());

describe("native client extensions", () => {
  it("provisions only the first operator with verified email, hashed credentials and mandatory MFA", async () => {
    const initial = {
      email: `bootstrap-${crypto.randomUUID()}@quickpay.test`,
      phoneNumber: "07047160299",
      password: "Initial123!",
    };
    const result = await bootstrapAdmin(initial);
    const row = (
      await pool.query(
        "SELECT u.role,u.email_verified,u.phone_verified,u.two_factor_enabled,u.permissions,a.password FROM users u JOIN auth_accounts a ON a.user_id=u.id WHERE u.id=$1",
        [result.id],
      )
    ).rows[0];
    expect(row.role).toBe("admin");
    expect(row.email_verified).toBe(true);
    expect(row.phone_verified).toBe(false);
    expect(row.two_factor_enabled).toBe(false);
    expect(row.permissions).toContain("operations.write");
    expect(row.password).not.toBe(initial.password);
    const signedIn = await handleAuth(
      new Request("http://localhost:3001/api/v1/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "expo-origin": "quickpay-dev://",
          "x-real-ip": "127.0.0.2",
          "x-forwarded-for": "127.0.0.2",
        },
        body: JSON.stringify({
          email: initial.email,
          password: initial.password,
        }),
      }),
    );
    expect(signedIn.status).toBe(200);
    await pool.query("UPDATE users SET email_verified=false WHERE id=$1", [
      result.id,
    ]);
    await verifyAdminEmail(initial.email);
    expect(
      (
        await pool.query(
          "SELECT email_verified,two_factor_enabled FROM users WHERE id=$1",
          [result.id],
        )
      ).rows[0],
    ).toMatchObject({ email_verified: true, two_factor_enabled: false });
    await pool.query(
      "UPDATE users SET email_verified=false WHERE id=ANY($1::text[])",
      [[result.id, ids.user]],
    );
    const repair = await readFile(
      "packages/database/migrations/0012_operator_setup.sql",
      "utf8",
    );
    await pool.query(
      "INSERT INTO service_catalog(id,name,category,provider,min,max,enabled) VALUES('mtn','MTN','airtime','vtpass',5000,10000000,false),('custom-test','Custom','airtime','vtpass',5000,10000000,false)",
    );
    await pool.query(repair);
    expect(
      (await pool.query("SELECT enabled FROM service_catalog WHERE id='mtn'"))
        .rows[0].enabled,
    ).toBe(false);
    await atomic(async (c) => {
      await c.query(
        "SELECT set_config('quickpay.payment_mode','sandbox',true)",
      );
      await c.query(repair);
      await c.query(repair);
    });
    expect(
      (await pool.query("SELECT enabled FROM service_catalog WHERE id='mtn'"))
        .rows[0].enabled,
    ).toBe(true);
    expect(
      (
        await pool.query(
          "SELECT enabled FROM service_catalog WHERE id='custom-test'",
        )
      ).rows[0].enabled,
    ).toBe(false);
    expect(
      (
        await pool.query("SELECT email_verified FROM users WHERE id=$1", [
          result.id,
        ])
      ).rows[0].email_verified,
    ).toBe(true);
    expect(
      (
        await pool.query("SELECT email_verified FROM users WHERE id=$1", [
          ids.user,
        ])
      ).rows[0].email_verified,
    ).toBe(false);
    await pool.query("UPDATE users SET email_verified=true WHERE id=$1", [
      ids.user,
    ]);
    await expect(verifyAdminEmail(`${ids.user}@quickpay.test`)).rejects.toThrow(
      "No administrator",
    );
    await expect(
      bootstrapAdmin({
        ...initial,
        email: "another-bootstrap@quickpay.test",
        phoneNumber: "07047160298",
      }),
    ).rejects.toThrow("no existing admin");
  });
  const nativeLogins = new Map<string, string>();
  async function login(id = ids.user) {
    if (nativeLogins.has(id)) return nativeLogins.get(id)!;
    const response = await handleAuth(
      new Request("http://localhost:3001/api/v1/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "expo-origin": "quickpay-dev://",
        },
        body: JSON.stringify({
          email: `${id}@quickpay.test`,
          password: testPassword,
        }),
      }),
    );
    expect(response.status).toBe(200);
    const token = response.headers.get("set-auth-token");
    expect(token).toBeTruthy();
    nativeLogins.set(id, token!);
    return token!;
  }
  function request(token: string, payload?: unknown, method = "GET") {
    return new Request("http://localhost:3001/api/v1/native-test", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
  }
  it("uses real native bearer sign-in, sliding session and revocation without changing browser cookies", async () => {
    const token = await login();
    const session = await auth().api.getSession({
      headers: request(token).headers,
    });
    expect(session?.user.id).toBe(ids.user);
    const caps = await (await walletCapabilities(request(token))).json();
    expect(caps.deposit).toMatchObject({
      available: false,
      minimum: "10000",
      maximum: "100000000",
      fee: "0",
      methods: [],
    });
    await auth().api.signOut({ headers: request(token).headers });
    nativeLogins.delete(ids.user);
    await expect(walletCapabilities(request(token))).rejects.toThrow("sign in");
  });
  it("recovers only the owner’s exact idempotency reference", async () => {
    const row = await payment("deposit");
    const owner = await login(),
      other = await login(ids.other);
    expect(
      (await (await recoverPayment(request(owner), row.id)).json()).transaction
        .id,
    ).toBe(row.id);
    expect(
      (await (await recoverPayment(request(other), row.id)).json()).transaction,
    ).toBeNull();
    expect(
      (await (await recoverPayment(request(owner), crypto.randomUUID())).json())
        .transaction,
    ).toBeNull();
  });
  it("disables unconfigured push registration and preference enablement", async () => {
    const token = await login();
    const result = await (await preferences(request(token))).json();
    expect(result.pushAvailable).toBe(false);
    await expect(
      preferences(request(token, { pushEnabled: true }, "PATCH")),
    ).rejects.toThrow("unavailable");
    await expect(
      devices(
        request(
          token,
          {
            installationId: crypto.randomUUID(),
            token: "ExponentPushToken[abc]",
            platform: "android",
          },
          "POST",
        ),
      ),
    ).rejects.toThrow("unavailable");
  });
  it("binds push devices to the authenticated account and restricts revocation", async () => {
    const config = env();
    config.PUSH_ENABLED = "true";
    config.EXPO_ACCESS_TOKEN = "local-provider-test";
    try {
      const owner = await login(),
        other = await login(ids.other),
        installationId = crypto.randomUUID();
      await devices(
        request(
          owner,
          {
            installationId,
            token: "ExponentPushToken[ownership_test]",
            platform: "android",
          },
          "POST",
        ),
      );
      await devices(request(other, { installationId }, "DELETE"));
      expect(
        (
          await pool.query(
            "SELECT user_id FROM mobile_devices WHERE installation_id=$1",
            [installationId],
          )
        ).rows[0].user_id,
      ).toBe(ids.user);
      await devices(
        request(
          other,
          {
            installationId,
            token: "ExponentPushToken[ownership_test]",
            platform: "android",
          },
          "POST",
        ),
      );
      expect(
        (
          await pool.query(
            "SELECT user_id FROM mobile_devices WHERE installation_id=$1",
            [installationId],
          )
        ).rows[0].user_id,
      ).toBe(ids.other);
      await devices(request(other, { installationId }, "DELETE"));
    } finally {
      config.PUSH_ENABLED = "false";
      config.EXPO_ACCESS_TOKEN = undefined;
    }
  });
  it("queues generic push payloads, checks receipts and removes unregistered tokens", async () => {
    const config = env();
    config.PUSH_ENABLED = "true";
    config.EXPO_ACCESS_TOKEN = "local-provider-test";
    config.EXPO_ACCESS_TOKEN = "local-provider-test";
    const fetcher = vi.spyOn(globalThis, "fetch");
    try {
      const token = await login(),
        installationId = crypto.randomUUID(),
        notificationId = crypto.randomUUID();
      await devices(
        request(
          token,
          {
            installationId,
            token: "ExponentPushToken[delivery_test]",
            platform: "ios",
          },
          "POST",
        ),
      );
      await preferences(request(token, { pushEnabled: true }, "PATCH"));
      await pool.query(
        "INSERT INTO notifications(id,user_id,title,body) VALUES($1,$2,'Private information','Private payment information')",
        [notificationId, ids.user],
      );
      expect(
        (
          await pool.query("SELECT 1 FROM jobs WHERE dedupe=$1", [
            `push:${notificationId}`,
          ])
        ).rowCount,
      ).toBe(1);
      await deliverPush(notificationId);
      const job = (
        await pool.query(
          "SELECT payload FROM jobs WHERE type='push-device' AND payload->>'notificationId'=$1",
          [notificationId],
        )
      ).rows[0];
      fetcher.mockResolvedValueOnce(
        Response.json({ data: [{ status: "ok", id: "native-ticket-test" }] }),
      );
      await deliverDevice(job.payload);
      const payload = JSON.parse(String(fetcher.mock.calls.at(-1)?.[1]?.body));
      expect(JSON.stringify(payload)).not.toContain("Private");
      expect(payload[0].data).toEqual({
        type: "notification",
        id: notificationId,
      });
      fetcher.mockResolvedValueOnce(
        Response.json({
          data: {
            "native-ticket-test": {
              status: "error",
              details: { error: "DeviceNotRegistered" },
            },
          },
        }),
      );
      await checkPushReceipt("native-ticket-test");
      expect(
        (
          await pool.query(
            "SELECT 1 FROM mobile_devices WHERE installation_id=$1",
            [installationId],
          )
        ).rowCount,
      ).toBe(0);
    } finally {
      config.PUSH_ENABLED = "false";
      config.EXPO_ACCESS_TOKEN = undefined;
      config.EXPO_ACCESS_TOKEN = undefined;
      fetcher.mockRestore();
    }
  });
  it("accepts bounded native multipart uploads without Content-Length and keeps evidence private", async () => {
    const token = await login();
    const data = new FormData();
    data.append(
      "file",
      new File(
        [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0])],
        "private.png",
        { type: "image/png" },
      ),
    );
    const response = await uploadEvidence(
      new Request("http://localhost:3001/api/v1/gift-cards/evidence", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      }),
    );
    const value = await response.json();
    expect(value.status).toBe("quarantined");
    expect(value.url).toBeUndefined();
    const row = (
      await pool.query("SELECT * FROM evidence WHERE id=$1", [value.id])
    ).rows[0];
    expect(row.user_id).toBe(ids.user);
    expect(row.file_path).toBe(`database:${value.id}`);
    expect(row.encrypted_content).not.toContain("private.png");
    const expectedBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
    expect(Buffer.from(unseal(row.encrypted_content), "base64")).toEqual(
      expectedBytes,
    );
    const ownerRequest = new Request("http://localhost:3001", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const download = endpoint(
      (request) => readEvidence(request, value.id),
      true,
    );
    const context = { params: Promise.resolve({}) };
    expect((await download(ownerRequest, context)).status).toBe(409);
    // Only the test fixture marks a file clean; uploads never bypass quarantine.
    await pool.query("UPDATE evidence SET status='clean' WHERE id=$1", [
      value.id,
    ]);
    const privateDownload = await download(ownerRequest, context);
    expect(privateDownload.status).toBe(200);
    expect(privateDownload.headers.get("Cache-Control")).toBe("no-store");
    expect(Buffer.from(await privateDownload.arrayBuffer())).toEqual(
      expectedBytes,
    );
    const otherRequest = new Request("http://localhost:3001", {
      headers: { Authorization: `Bearer ${await login(ids.other)}` },
    });
    expect((await download(otherRequest, context)).status).toBe(403);
  });
});
describe("exact money and request contracts", () => {
  it("normalizes Nigerian phones and preserves exact kobo", () => {
    expect(phone.parse("0803 123 4567")).toBe("+2348031234567");
    expect(parseNaira("99999999.99")).toBe("9999999999");
    expect(() => parseNaira("1.001")).toThrow();
  });
  it("requires terms and matching passwords", () => {
    const base = {
      name: "Test User",
      email: "test@example.com",
      phoneNumber: "08031234567",
      password: testPassword,
      confirmPassword: "different",
      terms: false,
    };
    expect(signUpSchema.safeParse(base).success).toBe(false);
    expect(
      signUpSchema.safeParse({
        ...base,
        terms: true,
        confirmPassword: testPassword,
      }).success,
    ).toBe(true);
  });
});
describe("immutable, concurrent financial records", () => {
  it("deduplicates verified deposits under concurrent processing", async () => {
    const p = await payment("deposit");
    const before = await balance(ids.user);
    const outcome = {
      status: "successful" as const,
      amount: p.amount,
      currency: "NGN",
      reference: p.reference,
      email: `${ids.user}@quickpay.test`,
    };
    await Promise.all([
      settlePayment(p.id, outcome),
      settlePayment(p.id, outcome),
    ]);
    expect(await balance(ids.user)).toBe(before + 10000n);
    expect(
      (
        await pool.query("SELECT * FROM journals WHERE reference=$1", [
          `deposit:${p.id}`,
        ])
      ).rowCount,
    ).toBe(1);
  });
  it("rejects wrong amounts, currency, reference and destination", async () => {
    const p = await payment("deposit");
    const valid = {
      status: "successful" as const,
      amount: p.amount,
      currency: "NGN",
      reference: p.reference,
      email: `${ids.user}@quickpay.test`,
    };
    for (const wrong of [
      { amount: "1" },
      { currency: "USD" },
      { reference: "wrong" },
      { email: "wrong@example.com" },
    ])
      await expect(
        settlePayment(p.id, { ...valid, ...wrong }),
      ).rejects.toThrow();
    expect(
      (await pool.query("SELECT status FROM transactions WHERE id=$1", [p.id]))
        .rows[0].status,
    ).toBe("processing");
  });
  it("enforces balanced and immutable journals in PostgreSQL", async () => {
    await expect(
      atomic(async (c) => {
        await c.query(
          "INSERT INTO journals(id,reference,reason) VALUES('unbalanced','unbalanced','test')",
        );
      }),
    ).rejects.toThrow("Unbalanced");
    await expect(
      pool.query("UPDATE ledger_entries SET amount=1"),
    ).rejects.toThrow("immutable");
    await expect(pool.query("DELETE FROM journals")).rejects.toThrow(
      "immutable",
    );
  });
  it("prevents concurrent withdrawals from double spending", async () => {
    await fund(ids.other, 10000n);
    const reserve = (ref: string) =>
      atomic((c) =>
        postJournal(c, ref, "Reserve", [
          { account: `${ids.other}:available`, amount: -8000n },
          { account: `${ids.other}:reserved`, amount: 8000n },
        ]),
      );
    const result = await Promise.allSettled([
      reserve("withdraw-a"),
      reserve("withdraw-b"),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await balance(ids.other)).toBe(2000n);
    expect(await balance(ids.other, "reserved")).toBe(8000n);
  });
  it("rejects insufficient funds without partial entries", async () => {
    const count = (await pool.query("SELECT count(*) FROM journals")).rows[0]
      .count;
    await expect(
      atomic((c) =>
        postJournal(c, "insufficient", "Spend", [
          { account: `${ids.other}:available`, amount: -999999n },
          { account: "platform:clearing", amount: 999999n },
        ]),
      ),
    ).rejects.toThrow("enough");
    expect(
      (await pool.query("SELECT count(*) FROM journals")).rows[0].count,
    ).toBe(count);
  });
  it("releases failed transfers and compensates reversed successful transfers", async () => {
    for (const reverse of [false, true]) {
      const p = await payment("withdrawal", "1000", ids.user, "processing", {
        recipientCode: "RCP_test",
      });
      await atomic((c) =>
        postJournal(c, `reserve:${p.id}`, "Reserve", [
          { account: `${ids.user}:available`, amount: -1000n },
          { account: `${ids.user}:reserved`, amount: 1000n },
        ]),
      );
      const before = await balance(ids.user);
      const outcome = {
        amount: p.amount,
        currency: "NGN",
        reference: p.reference,
        recipient: "RCP_test",
      };
      if (reverse) {
        await settlePayment(p.id, { ...outcome, status: "successful" });
        await settlePayment(p.id, { ...outcome, status: "reversed" });
      } else await settlePayment(p.id, { ...outcome, status: "failed" });
      expect(await balance(ids.user)).toBe(before + 1000n);
    }
  });
  it("keeps provider timeouts pending with reservation held", async () => {
    const p = await payment("withdrawal", "1000", ids.user, "processing", {
      recipientCode: "RCP_test",
      initiationStarted: true,
    });
    await atomic((c) =>
      postJournal(c, `reserve:${p.id}`, "Reserve", [
        { account: `${ids.user}:available`, amount: -1000n },
        { account: `${ids.user}:reserved`, amount: 1000n },
      ]),
    );
    const config = env(),
      previousMode = config.PAYMENT_MODE,
      previousKey = config.PAYSTACK_SECRET_KEY;
    config.PAYMENT_MODE = "sandbox";
    config.PAYSTACK_SECRET_KEY = "sk_test_timeout";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")),
    );
    try {
      await expect(processPayment(p.id)).rejects.toMatchObject({
        code: "PAYMENT_PENDING",
      });
    } finally {
      vi.unstubAllGlobals();
      config.PAYMENT_MODE = previousMode;
      config.PAYSTACK_SECRET_KEY = previousKey;
    }
    expect(
      (await pool.query("SELECT status FROM transactions WHERE id=$1", [p.id]))
        .rows[0].status,
    ).toBe("processing");
    expect(await balance(ids.user, "reserved")).toBeGreaterThanOrEqual(1000n);
  });
  it("rejects idempotency key reuse with different details", async () => {
    const p = await payment("deposit");
    await expect(
      atomic((c) => idempotent(c, ids.user, p.id, "changed")),
    ).rejects.toThrow("different");
  });
});
describe("webhook authentication and delivery", () => {
  it("rejects invalid signatures and verifies exact raw body bytes", () => {
    const raw = '{"event":"charge.success"}',
      secret = "test";
    const sig = createHmac("sha512", secret).update(raw).digest("hex");
    expect(validPaystackSignature(raw, sig, secret)).toBe(true);
    expect(validPaystackSignature(raw + " ", sig, secret)).toBe(false);
    expect(validPaystackSignature(raw, "bad", secret)).toBe(false);
  });
  it("deduplicates authenticated webhook events and durable jobs", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_local";
    const e = env();
    e.PAYSTACK_SECRET_KEY = "sk_test_local";
    const raw = JSON.stringify({
      event: "charge.success",
      data: { id: 1, reference: "same" },
    });
    const signature = createHmac("sha512", e.PAYSTACK_SECRET_KEY)
      .update(raw)
      .digest("hex");
    const make = (sig: string) =>
      new Request("http://localhost:3001/api/v1/webhooks/paystack", {
        method: "POST",
        headers: { "x-paystack-signature": sig },
        body: raw,
      });
    await expect(paystackWebhook(make("bad"))).rejects.toThrow(
      "authentication",
    );
    await Promise.all([
      paystackWebhook(make(signature)),
      paystackWebhook(make(signature)),
    ]);
    expect((await pool.query("SELECT * FROM webhook_events")).rowCount).toBe(1);
    expect(
      (await pool.query("SELECT * FROM jobs WHERE type='verify-provider'"))
        .rowCount,
    ).toBe(1);
  });
});
describe("versioned referral rewards", () => {
  const rule: RewardRule = {
    name: "Local rule",
    enabled: true,
    type: "percentage",
    value: "500",
    recipient: "referrer",
    categories: ["airtime"],
    serviceIds: [],
    frequency: "recurring",
    minimum: "100",
    base: "payment",
    maximum: "5000",
    userCap: "50000",
    campaignCap: "500000",
    startsAt: "2020-01-01T00:00:00.000Z",
    endsAt: null,
    holdingHours: 0,
    claimable: true,
    withdrawable: true,
    effectiveAt: "2020-01-01T00:00:00.000Z",
  };
  it("validates structured rules and computes exact capped rewards", () => {
    expect(
      rewardRuleSchema.safeParse({ ...rule, value: "10001" }).success,
    ).toBe(false);
    expect(calculateReward(rule, 10000n, 100n)).toBe(500n);
    expect(calculateReward(rule, 999999n, 100n)).toBe(5000n);
  });
  it("preserves rule versions, deduplicates rewards and reverses refunds", async () => {
    const ruleId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO reward_rules(id,version,rule,created_by) VALUES($1,1,$2,$3)",
      [ruleId, JSON.stringify(rule), ids.referrer],
    );
    const p = await payment("payment", "1000", ids.user, "processing", {
      category: "airtime",
    });
    await atomic((c) =>
      postJournal(c, `reserve:${p.id}`, "Reserve", [
        { account: `${ids.user}:available`, amount: -1000n },
        { account: `${ids.user}:reserved`, amount: 1000n },
      ]),
    );
    const outcome = { amount: "1000", currency: "NGN", reference: p.reference };
    await settlePayment(p.id, { ...outcome, status: "successful" });
    await settlePayment(p.id, { ...outcome, status: "successful" });
    await pool.query(
      "INSERT INTO reward_rules(id,version,rule,created_by) VALUES($1,2,$2,$3)",
      [
        crypto.randomUUID(),
        JSON.stringify({
          ...rule,
          value: "1000",
          effectiveAt: new Date().toISOString(),
        }),
        ids.referrer,
      ],
    );
    const reward = (
      await pool.query("SELECT * FROM rewards WHERE transaction_id=$1", [p.id])
    ).rows;
    expect(reward).toHaveLength(1);
    expect(reward[0].rule_id).toBe(ruleId);
    expect(reward[0].amount).toBe("50");
    await settlePayment(p.id, { ...outcome, status: "reversed" });
    expect(
      (
        await pool.query("SELECT status FROM rewards WHERE id=$1", [
          reward[0].id,
        ])
      ).rows[0].status,
    ).toBe("reversed");
  });
});
describe("API authorization and ownership", () => {
  it("prevents cross-user transaction access", async () => {
    const p = await payment("deposit");
    await expect(ownPayment(p.id, ids.other)).rejects.toThrow("could not find");
  });
  it("denies unauthenticated admin access", async () => {
    await expect(
      authorized(
        new Request("http://localhost:3001/api/v1/admin/users"),
        "users.read",
      ),
    ).rejects.toThrow("sign in");
  });
  it("denies customer admin escalation and requires MFA for administrators", async () => {
    const login = await auth().api.signInEmail({
      body: { email: `${ids.user}@quickpay.test`, password: testPassword },
    });
    const req = new Request("http://localhost:3001/api/v1/admin/users", {
      headers: { authorization: `Bearer ${login.token}` },
    });
    await expect(authorized(req, "users.read")).rejects.toThrow("access");
    await pool.query(
      "UPDATE users SET role='admin',permissions='[\"users.read\"]',two_factor_enabled=false WHERE id=$1",
      [ids.user],
    );
    await expect(authorized(req, "users.read")).rejects.toThrow("two-step");
  });
  it("rejects cross-origin browser mutations with a safe error", async () => {
    const handler = endpoint(async () => json({ ok: true }));
    const r = await handler(
      new Request("http://localhost:3001/api/v1/profile", {
        method: "POST",
        headers: { origin: "https://evil.example", cookie: "session=abc" },
        body: "{}",
      }),
      { params: Promise.resolve({}) },
    );
    expect(r.status).toBe(403);
    expect((await r.json()).error.code).toBe("CSRF");
  });
});
describe("account lifecycle and ledger enforcement", () => {
  it("shares a capped transaction reward without exceeding the combined maximum", async () => {
    const buyer = crypto.randomUUID();
    await user(buyer, ids.referrer);
    await fund(buyer, 1000n);
    const rule = {
      name: "Shared cap",
      enabled: true,
      type: "fixed",
      value: "51",
      recipient: "both",
      categories: ["airtime"],
      serviceIds: [],
      frequency: "recurring",
      minimum: "100",
      base: "payment",
      maximum: "51",
      userCap: "100",
      campaignCap: "1000",
      startsAt: "2019-01-01T00:00:00.000Z",
      endsAt: null,
      holdingHours: 0,
      claimable: true,
      withdrawable: true,
      effectiveAt: "2019-01-01T00:00:00.000Z",
    };
    const ruleId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO reward_rules(id,version,rule,created_by) VALUES($1,0,$2,$3)",
      [ruleId, JSON.stringify(rule), ids.referrer],
    );
    const p = await payment("payment", "1000", buyer, "processing", {
      category: "airtime",
    });
    await pool.query(
      "UPDATE transactions SET created_at='2019-01-02T00:00:00Z' WHERE id=$1",
      [p.id],
    );
    await atomic((c) =>
      postJournal(c, `reserve:${p.id}`, "Reserve", [
        { account: `${buyer}:available`, amount: -1000n },
        { account: `${buyer}:reserved`, amount: 1000n },
      ]),
    );
    await settlePayment(p.id, {
      status: "successful",
      amount: "1000",
      currency: "NGN",
      reference: p.reference,
    });
    const rewards = (
      await pool.query(
        "SELECT amount,rule_id FROM rewards WHERE transaction_id=$1 ORDER BY amount DESC",
        [p.id],
      )
    ).rows;
    expect(rewards).toHaveLength(2);
    expect(rewards.map((r) => r.amount)).toEqual(["26", "25"]);
    expect(rewards.every((r) => r.rule_id === ruleId)).toBe(true);
  });
  it("verifies only an owned, unexpired phone challenge and prevents replay", async () => {
    const login = await auth().api.signInEmail({
      body: { email: `${ids.referrer}@quickpay.test`, password: testPassword },
    });
    const other = await auth().api.signInEmail({
      body: { email: `${ids.user}@quickpay.test`, password: testPassword },
    });
    const config = env();
    config.SMS_ENABLED = "true";
    config.TERMII_API_KEY = "local-fixture";
    config.TERMII_BASE_URL = "https://api.ng.termii.com";
    config.TERMII_SENDER_ID = "QuickPay";
    const number = (
      await pool.query("SELECT phone_number FROM users WHERE id=$1", [
        ids.referrer,
      ])
    ).rows[0].phone_number;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const payload = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify(
            payload.pin
              ? {
                  pinId: "phone-fixture",
                  verified: payload.pin === "123456" ? "True" : "False",
                  msisdn: number.replace("+", ""),
                }
              : { pinId: "phone-fixture" },
          ),
          { status: 200 },
        );
      }),
    );
    const request = (token: string, payload: unknown) =>
      new Request("http://localhost:3001/api/v1/verification/phone", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    try {
      const challenge = await (await sendCode(request(login.token, {}))).json();
      await expect(
        verifyCode(request(other.token, { id: challenge.id, code: "123456" })),
      ).rejects.toThrow("new code");
      await expect(
        verifyCode(request(login.token, { id: challenge.id, code: "000000" })),
      ).rejects.toThrow("incorrect");
      expect(
        (
          await verifyCode(
            request(login.token, { id: challenge.id, code: "123456" }),
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await pool.query("SELECT phone_verified FROM users WHERE id=$1", [
            ids.referrer,
          ])
        ).rows[0].phone_verified,
      ).toBe(true);
      await expect(
        verifyCode(request(login.token, { id: challenge.id, code: "123456" })),
      ).rejects.toThrow("new code");
    } finally {
      config.SMS_ENABLED = "false";
      config.TERMII_API_KEY = undefined;
      config.TERMII_BASE_URL = undefined;
      config.TERMII_SENDER_ID = undefined;
      vi.unstubAllGlobals();
    }
  });
  it("enrolls MFA, unlocks one admin session and persists an audited reward rule through its API", async () => {
    const login = await auth().api.signInEmail({
      body: { email: `${ids.other}@quickpay.test`, password: testPassword },
    });
    const headers = {
      authorization: `Bearer ${login.token}`,
      "content-type": "application/json",
    };
    await pool.query(
      "UPDATE users SET role='admin',permissions='[\"rewards.read\",\"rewards.write\"]' WHERE id=$1",
      [ids.other],
    );
    const setup = await auth().api.enableTwoFactor({
      headers: new Headers(headers),
      body: { password: testPassword },
    });
    if (setup.method !== "totp")
      throw new Error("Expected authenticator enrollment");
    const secret = new URL(setup.totpURI).searchParams.get("secret")!;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (const char of secret.replace(/=/g, ""))
      bits += alphabet.indexOf(char.toUpperCase()).toString(2).padStart(5, "0");
    const key = Buffer.from(
      bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)),
    );
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const digest = createHmac("sha1", key).update(counter).digest(),
      offset = digest[19] & 15;
    const code = ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
      .toString()
      .padStart(6, "0");
    await auth().api.verifyTOTP({
      headers: new Headers(headers),
      body: { code },
    });
    headers.authorization = `Bearer ${(await pool.query("SELECT token FROM sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1", [ids.other])).rows[0].token}`;
    const req = (path: string, payload: unknown) =>
      new Request(`http://localhost:3001/api/v1${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    await expect(
      authorized(req("/admin/reward-rules", {}), "rewards.write"),
    ).rejects.toThrow("authenticator code");
    expect((await unlockAdmin(req("/admin/unlock", { code }))).status).toBe(
      200,
    );
    const rule = {
      name: "API saved campaign",
      enabled: false,
      type: "fixed",
      value: "100",
      recipient: "referrer",
      categories: ["airtime"],
      serviceIds: [],
      frequency: "first",
      minimum: "100",
      base: "payment",
      maximum: "100",
      userCap: "1000",
      campaignCap: "10000",
      startsAt: new Date().toISOString(),
      endsAt: null,
      holdingHours: 24,
      claimable: true,
      withdrawable: true,
      effectiveAt: new Date(Date.now() + 86400000).toISOString(),
    };
    const response = await rewardRules(req("/admin/reward-rules", rule));
    expect(response.status).toBe(201);
    const saved = await response.json();
    expect(
      (
        await pool.query("SELECT rule FROM reward_rules WHERE id=$1", [
          saved.id,
        ])
      ).rows[0].rule.name,
    ).toBe(rule.name);
    expect(
      (
        await pool.query(
          "SELECT 1 FROM audit_events WHERE resource=$1 AND action='reward_rule.created'",
          [saved.id],
        )
      ).rowCount,
    ).toBe(1);
  });
  it("releases a reservation when a provider reverses before settlement", async () => {
    const p = await payment("withdrawal", "1000", ids.user, "processing", {
      recipientCode: "RCP_reversed",
    });
    const before = await balance(ids.user);
    await atomic((c) =>
      postJournal(c, `reserve:${p.id}`, "Reserve", [
        { account: `${ids.user}:available`, amount: -1000n },
        { account: `${ids.user}:reserved`, amount: 1000n },
      ]),
    );
    const reserved = await balance(ids.user, "reserved");
    await settlePayment(p.id, {
      status: "reversed",
      amount: "1000",
      currency: "NGN",
      reference: p.reference,
      recipient: "RCP_reversed",
    });
    expect(await balance(ids.user)).toBe(before);
    expect(await balance(ids.user, "reserved")).toBe(reserved - 1000n);
  });
  it("creates an account with normalized phone and server-recorded policy acceptance", async () => {
    const email = `signup-${crypto.randomUUID()}@quickpay.test`;
    const r = await handleAuth(
      new Request("http://localhost:3000/api/v1/auth/sign-up/email", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Signup Test",
          email,
          phoneNumber: "08099998888",
          password: testPassword,
          confirmPassword: testPassword,
          terms: true,
          role: "admin",
          policyVersion: "tampered",
        }),
      }),
    );
    expect(r.status).toBe(200);
    const {
      rows: [u],
    } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    expect(u.phone_number).toBe("+2348099998888");
    expect(u.role).toBe("customer");
    expect(u.policy_version).toBe("2026-11-04-draft");
    expect(u.email_verified).toBe(false);
    const {
      rows: [mail],
    } = await pool.query(
      "SELECT payload FROM jobs WHERE type='email' AND payload->>'to'=$1 ORDER BY created_at DESC LIMIT 1",
      [email],
    );
    const url = mail.payload.text.match(/https?:\/\/\S+/)[0];
    const verified = await auth().handler(new Request(url));
    expect([200, 302]).toContain(verified.status);
    expect(
      (await pool.query("SELECT email_verified FROM users WHERE id=$1", [u.id]))
        .rows[0].email_verified,
    ).toBe(true);
    const login = await auth().api.signInEmail({
      body: { email, password: testPassword },
    });
    expect(login.token).toBeTruthy();
  });
  it("rejects weak reset passwords on the server", async () => {
    await expect(
      handleAuth(
        new Request("http://localhost:3000/api/v1/auth/reset-password", {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            token: "invalid",
            newPassword: "alllowercasewithoutnumber",
          }),
        }),
      ),
    ).rejects.toThrow();
  });
  it("prevents direct balance edits and later journal appends", async () => {
    await expect(
      pool.query("UPDATE ledger_accounts SET balance=balance+100 WHERE id=$1", [
        `${ids.user}:available`,
      ]),
    ).rejects.toThrow("journals only");
    const journal = (await pool.query("SELECT id FROM journals LIMIT 1"))
      .rows[0].id;
    await expect(
      pool.query(
        "INSERT INTO ledger_entries(journal_id,account_id,amount) VALUES($1,$2,1)",
        [journal, "platform:clearing"],
      ),
    ).rejects.toThrow("committed journal");
  });
  it("claims an available reward only once and compensates a claimed reward on refund", async () => {
    const p = await payment("payment", "1000", ids.user, "processing", {
      category: "airtime",
    });
    await atomic((c) =>
      postJournal(c, `reserve:${p.id}`, "Reserve", [
        { account: `${ids.user}:available`, amount: -1000n },
        { account: `${ids.user}:reserved`, amount: 1000n },
      ]),
    );
    const outcome = { amount: "1000", currency: "NGN", reference: p.reference };
    await settlePayment(p.id, { ...outcome, status: "successful" });
    // This scenario tests claiming an eligible reward, not synchronization
    // between the host clock used for available_at and PostgreSQL's clock.
    // Make eligibility explicit in this disposable fixture before releasing.
    await pool.query(
      "UPDATE rewards SET available_at=now()-interval '1 second' WHERE transaction_id=$1 AND status='pending'",
      [p.id],
    );
    await atomic(releaseRewards);
    const r = (
      await pool.query("SELECT * FROM rewards WHERE transaction_id=$1", [p.id])
    ).rows[0];
    expect(r.status).toBe("available");
    const login = await auth().api.signInEmail({
      body: { email: `${ids.referrer}@quickpay.test`, password: testPassword },
    });
    const request = () =>
      new Request("http://localhost:3001/api/v1/rewards/claim", {
        method: "POST",
        headers: {
          authorization: `Bearer ${login.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ pin: "572904" }),
      });
    const before = await balance(ids.referrer);
    await claimReward(request(), r.id);
    await claimReward(request(), r.id);
    expect(await balance(ids.referrer)).toBe(before + BigInt(r.amount));
    await settlePayment(p.id, { ...outcome, status: "reversed" });
    expect(await balance(ids.referrer)).toBe(before);
  });
  it("holds suspicious referral rewards without changing historical awards", async () => {
    await pool.query(
      "INSERT INTO referral_holds(user_id,active,reason,actor_id) VALUES($1,true,'Local review test',$2)",
      [ids.user, ids.referrer],
    );
    const p = await payment("payment", "1000", ids.user, "processing", {
      category: "airtime",
    });
    await atomic((c) =>
      postJournal(c, `reserve:${p.id}`, "Reserve", [
        { account: `${ids.user}:available`, amount: -1000n },
        { account: `${ids.user}:reserved`, amount: 1000n },
      ]),
    );
    await settlePayment(p.id, {
      status: "successful",
      amount: "1000",
      currency: "NGN",
      reference: p.reference,
    });
    expect(
      (
        await pool.query("SELECT * FROM rewards WHERE transaction_id=$1", [
          p.id,
        ])
      ).rowCount,
    ).toBe(0);
  });
});

describe("gift-card review and settlement", () => {
  it("never credits a submission and requires independent verified settlement", async () => {
    const seller = crypto.randomUUID(),
      reviewer = crypto.randomUUID(),
      settler = crypto.randomUUID();
    await user(seller);
    await user(reviewer);
    await user(settler);
    const logins = await Promise.all(
      [seller, reviewer, settler].map((id) =>
        auth().api.signInEmail({
          body: { email: `${id}@quickpay.test`, password: testPassword },
        }),
      ),
    );
    const req = (index: number, path: string, payload: unknown) =>
      new Request(`http://localhost:3001/api/v1${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${logins[index].token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    // Separate operator sessions are provisioned only as authorization fixtures in the disposable test DB.
    for (const id of [reviewer, settler]) {
      await pool.query(
        'UPDATE users SET role=\'admin\',two_factor_enabled=true,permissions=\'["gift.review","gift.settle","evidence.scan"]\' WHERE id=$1',
        [id],
      );
      await pool.query(
        "INSERT INTO admin_elevations(session_id,expires_at) SELECT id,now()+interval '15 minutes' FROM sessions WHERE user_id=$1",
        [id],
      );
    }
    await pool.query(
      "INSERT INTO gift_products(id,brand,region,card_type,enabled,sell_enabled,rate_kobo,min_units,max_units) VALUES('local-card','Local card','US','digital',true,true,1000,10,100)",
    );
    const q = await (
      await giftQuote(
        req(0, "/gift-cards/quotes", { productId: "local-card", units: "10" }),
      )
    ).json();
    const evidence = crypto.randomUUID();
    await pool.query(
      "INSERT INTO evidence(id,user_id,file_path,mime,size) VALUES($1,$2,'private-test-artifact','image/png',100)",
      [evidence, seller],
    );
    const sale = await (
      await giftSales(
        req(0, "/gift-cards/sales", { quoteId: q.id, evidenceId: evidence }),
      )
    ).json();
    expect(await balance(seller)).toBe(0n);
    const action = (index: number, step: string) =>
      adminUpdate(
        req(index, "/admin/gifts", {
          id: sale.id,
          action: step,
          reason: "Local verified review evidence",
          settlementReference: "local-settlement-reference",
        }),
        "gifts",
      );
    await expect(action(1, "approve")).rejects.toThrow("safety");
    await action(1, "clean");
    await action(1, "approve");
    expect(await balance(seller)).toBe(0n);
    await expect(action(1, "settle")).rejects.toThrow("different");
    await action(2, "settle");
    expect(await balance(seller)).toBe(BigInt(q.amount));
    await expect(action(2, "settle")).rejects.toThrow();
    expect(await balance(seller)).toBe(BigInt(q.amount));
  });
});

describe("transaction PIN security", () => {
  it("persists failed attempts, locks, and resets only with a single-use verified email code", async () => {
    const id = crypto.randomUUID();
    await user(id);
    await expect(verifyTransactionPin(id, "572904")).rejects.toMatchObject({
      code: "PIN_REQUIRED",
    });
    await setTransactionPin(id, "572904");
    expect(
      (
        await pool.query(
          "SELECT pin_hash FROM transaction_pins WHERE user_id=$1",
          [id],
        )
      ).rows[0].pin_hash,
    ).not.toBe("572904");
    for (let i = 0; i < 5; i++)
      await expect(verifyTransactionPin(id, "111111")).rejects.toMatchObject({
        code: i === 4 ? "PIN_LOCKED" : "PIN_INCORRECT",
      });
    expect(
      (
        await pool.query(
          "SELECT failed_attempts FROM transaction_pins WHERE user_id=$1",
          [id],
        )
      ).rows[0].failed_attempts,
    ).toBe(5);
    await expect(verifyTransactionPin(id, "572904")).rejects.toMatchObject({
      code: "PIN_LOCKED",
    });
    await requestPinReset(id);
    const job = (
      await pool.query(
        "SELECT payload FROM jobs WHERE type='email' AND payload->>'to'=$1 AND payload->>'subject'='Reset your transaction PIN' ORDER BY created_at DESC LIMIT 1",
        [`${id}@quickpay.test`],
      )
    ).rows[0].payload;
    expect(job.text).toContain("{{code}}");
    const code = unseal(job.otpEncrypted);
    const wrong = String((Number(code) + 1) % 1000000).padStart(6, "0");
    await expect(
      resetTransactionPin(id, wrong, "684207"),
    ).rejects.toMatchObject({ code: "OTP_INVALID" });
    expect(
      (
        await pool.query(
          "SELECT attempts FROM pin_reset_challenges WHERE user_id=$1",
          [id],
        )
      ).rows[0].attempts,
    ).toBe(1);
    await resetTransactionPin(id, code, "684207");
    await verifyTransactionPin(id, "684207");
    await expect(resetTransactionPin(id, code, "906248")).rejects.toMatchObject(
      { code: "OTP_INVALID" },
    );
    await expect(verifyTransactionPin(id, "572904")).rejects.toMatchObject({
      code: "PIN_INCORRECT",
    });
  });
  it("requires the separate PIN for deposits, withdrawals and payments before any provider submission", async () => {
    const id = crypto.randomUUID();
    await user(id);
    await setTransactionPin(id, "572904");
    const login = await auth().api.signInEmail({
      body: { email: `${id}@quickpay.test`, password: testPassword },
      headers: new Headers({ "x-forwarded-for": "127.0.0.9" }),
    });
    const variants = [
      ["deposit", { amount: "10000" }],
      [
        "withdrawal",
        {
          amount: "10000",
          bankCode: "999",
          accountNumber: "1234567890",
          validationId: crypto.randomUUID(),
        },
      ],
      [
        "payment",
        { amount: "10000", serviceId: "mtn", beneficiary: "08031234567" },
      ],
    ] as const;
    for (const [kind, fields] of variants) {
      const req = new Request(`http://localhost:3001/api/v1/${kind}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${login.token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ ...fields, pin: "111111" }),
      });
      await expect(createOperation(req, kind)).rejects.toMatchObject({
        code: "PIN_INCORRECT",
      });
    }
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS count FROM transactions WHERE user_id=$1",
          [id],
        )
      ).rows[0].count,
    ).toBe(0);
  });
});

describe("PIN settings and account security alerts", () => {
  it("rejects weak PINs and requires both the login password and old PIN for a change", async () => {
    for (const value of ["111111", "123456", "987654", "1234", "abcdef"])
      expect(newTransactionPin.safeParse(value).success).toBe(false);
    const id = crypto.randomUUID();
    await user(id);
    const login = await auth().api.signInEmail({
      body: { email: `${id}@quickpay.test`, password: testPassword },
      headers: new Headers({ "x-forwarded-for": "127.0.0.12" }),
    });
    const req = (value?: unknown) =>
      new Request("http://localhost:3001/api/v1/security/pin", {
        method: value ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${login.token}`,
          "Content-Type": "application/json",
        },
        ...(value ? { body: JSON.stringify(value) } : {}),
      });
    expect(await (await pinSettings(req())).json()).toEqual({
      configured: false,
      lockedUntil: null,
    });
    await expect(
      pinSettings(
        req({
          password: "wrong-password",
          newPin: "572904",
          confirmPin: "572904",
        }),
      ),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_FAILED" });
    await pinSettings(
      req({ password: testPassword, newPin: "572904", confirmPin: "572904" }),
    );
    expect(await (await pinSettings(req())).json()).toEqual({
      configured: true,
      lockedUntil: null,
    });
    await expect(
      pinSettings(
        req({
          password: testPassword,
          currentPin: "684207",
          newPin: "906248",
          confirmPin: "906248",
        }),
      ),
    ).rejects.toMatchObject({ code: "PIN_INCORRECT" });
    await pinSettings(
      req({
        password: testPassword,
        currentPin: "572904",
        newPin: "906248",
        confirmPin: "906248",
      }),
    );
    await verifyTransactionPin(id, "906248");
    const jobs = (
      await pool.query(
        "SELECT payload FROM jobs WHERE type='email' AND payload->>'to'=$1",
        [`${id}@quickpay.test`],
      )
    ).rows;
    expect(jobs.map((j) => j.payload.subject)).toEqual(
      expect.arrayContaining([
        "Transaction PIN set",
        "Transaction PIN changed",
      ]),
    );
    expect(JSON.stringify(jobs)).not.toMatch(/572904|906248|StrongPassword123/);
  });
  it("queues branded-delivery jobs for successful login and password change without exposing credentials", async () => {
    const id = crypto.randomUUID();
    await user(id);
    const headers = {
      "content-type": "application/json",
      "expo-origin": "quickpay-dev://",
      "x-real-ip": "127.0.0.13",
      "x-forwarded-for": "127.0.0.13",
      "user-agent": "QuickPay Android",
    };
    const response = await handleAuth(
      new Request("http://localhost:3001/api/v1/auth/sign-in/email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: `${id}@quickpay.test`,
          password: testPassword,
        }),
      }),
    );
    expect(response.status).toBe(200);
    const login = await response.json();
    const changed = await handleAuth(
      new Request("http://localhost:3001/api/v1/auth/change-password", {
        method: "POST",
        headers: { ...headers, Authorization: `Bearer ${login.token}` },
        body: JSON.stringify({
          currentPassword: testPassword,
          newPassword: "NewPassword456!",
          revokeOtherSessions: true,
        }),
      }),
    );
    expect(changed.status).toBe(200);
    const jobs = (
      await pool.query(
        "SELECT payload FROM jobs WHERE type='email' AND payload->>'to'=$1",
        [`${id}@quickpay.test`],
      )
    ).rows;
    expect(jobs.map((j) => j.payload.subject)).toEqual(
      expect.arrayContaining([
        "New sign-in to Quick Pay",
        "Your password changed",
      ]),
    );
    expect(JSON.stringify(jobs)).not.toContain(login.token);
    expect(JSON.stringify(jobs)).not.toMatch(
      /StrongPassword123|NewPassword456/,
    );
  });
});

describe("deposit checkout recovery", () => {
  it("accepts a late verified deposit success after a failed attempt, credits once, and ignores stale failure responses", async () => {
    for (const state of ["failed", "cancelled"]) {
      const p = await payment("deposit", "10000", ids.user, state);
      const before = await balance(ids.user);
      const confirmed = {
        status: "successful" as const,
        amount: p.amount,
        currency: "NGN",
        reference: p.reference,
        email: `${ids.user}@quickpay.test`,
      };
      await expect(
        settlePayment(p.id, { ...confirmed, amount: "9999" }),
      ).rejects.toMatchObject({ code: "VERIFICATION_MISMATCH" });
      await expect(
        settlePayment(p.id, { ...confirmed, email: "other@example.test" }),
      ).rejects.toMatchObject({ code: "DESTINATION_MISMATCH" });
      await Promise.all([
        settlePayment(p.id, confirmed),
        settlePayment(p.id, confirmed),
      ]);
      expect(await balance(ids.user)).toBe(before + 10000n);
      expect(
        await settlePayment(p.id, { ...confirmed, status: "failed" }),
      ).toBe(false);
      expect(
        (
          await pool.query("SELECT status FROM transactions WHERE id=$1", [
            p.id,
          ])
        ).rows[0].status,
      ).toBe("successful");
      expect(
        (
          await pool.query("SELECT 1 FROM journals WHERE reference=$1", [
            `deposit:${p.id}`,
          ])
        ).rowCount,
      ).toBe(1);
    }
    const withdrawal = await payment(
      "withdrawal",
      "10000",
      ids.user,
      "failed",
      { recipientCode: "expected-recipient" },
    );
    await expect(
      settlePayment(withdrawal.id, {
        status: "successful",
        amount: withdrawal.amount,
        currency: "NGN",
        reference: withdrawal.reference,
        recipient: "expected-recipient",
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });
  it("serializes checkout preparation, preserves a charge confirmed during initialization, and uses the static return URL", async () => {
    const p = await payment("deposit");
    const config = env(),
      originalMode = config.PAYMENT_MODE,
      originalKey = config.PAYSTACK_SECRET_KEY;
    config.PAYMENT_MODE = "sandbox";
    config.PAYSTACK_SECRET_KEY = "sk_test_checkout_fixture";
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const before = await balance(ids.user);
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.reference).toBe(p.reference);
      expect(body.callback_url).toBe(
        `${config.WEB_ORIGIN}/transactions/detail?id=${p.id}`,
      );
      await gate;
      await settlePayment(p.id, {
        status: "successful",
        amount: p.amount,
        currency: "NGN",
        reference: p.reference,
        email: `${ids.user}@quickpay.test`,
      });
      return Response.json({
        status: true,
        data: {
          authorization_url: "https://checkout.paystack.com/local-checkout",
          access_code: "private-code",
          reference: p.reference,
        },
      });
    });
    vi.stubGlobal("fetch", fetcher);
    try {
      const first = prepareDepositCheckout(p.id);
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      await prepareDepositCheckout(p.id);
      expect(fetcher).toHaveBeenCalledTimes(1);
      finish();
      await first;
      const stored = (
        await pool.query<PaymentRow>("SELECT * FROM transactions WHERE id=$1", [
          p.id,
        ])
      ).rows[0];
      expect(stored.status).toBe("successful");
      expect(stored.details.checkoutUrl).toBe(
        "https://checkout.paystack.com/local-checkout",
      );
      expect(stored.details).not.toHaveProperty("checkoutLeaseToken");
      expect(stored.details).not.toHaveProperty("checkoutLeaseUntil");
      expect(JSON.stringify(publicTransaction(stored))).not.toContain(
        "private-code",
      );
      expect(await balance(ids.user)).toBe(before + 10000n);
    } finally {
      finish();
      vi.unstubAllGlobals();
      config.PAYMENT_MODE = originalMode;
      config.PAYSTACK_SECRET_KEY = originalKey;
    }
  });
  it("releases an interrupted checkout lease and retries with the same reference without falsely failing the deposit", async () => {
    const p = await payment("deposit");
    const config = env(),
      originalMode = config.PAYMENT_MODE,
      originalKey = config.PAYSTACK_SECRET_KEY;
    config.PAYMENT_MODE = "sandbox";
    config.PAYSTACK_SECRET_KEY = "sk_test_checkout_fixture";
    const before = await balance(ids.user);
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("Interrupted"));
    vi.stubGlobal("fetch", fetcher);
    try {
      await expect(prepareDepositCheckout(p.id)).rejects.toMatchObject({
        code: "PAYMENT_PENDING",
      });
      let stored = (
        await pool.query<PaymentRow>("SELECT * FROM transactions WHERE id=$1", [
          p.id,
        ])
      ).rows[0];
      expect(stored.status).toBe("processing");
      expect(stored.details).not.toHaveProperty("checkoutLeaseToken");
      fetcher.mockResolvedValue(
        Response.json({
          status: true,
          data: {
            authorization_url: "https://checkout.paystack.com/retry",
            access_code: "private",
            reference: p.reference,
          },
        }),
      );
      await prepareDepositCheckout(p.id);
      stored = (
        await pool.query<PaymentRow>("SELECT * FROM transactions WHERE id=$1", [
          p.id,
        ])
      ).rows[0];
      expect(stored.status).toBe("awaiting_authorization");
      expect(await balance(ids.user)).toBe(before);
      expect(
        fetcher.mock.calls.map(
          (call) => JSON.parse(String(call[1]?.body)).reference,
        ),
      ).toEqual([p.reference, p.reference]);
    } finally {
      vi.unstubAllGlobals();
      config.PAYMENT_MODE = originalMode;
      config.PAYSTACK_SECRET_KEY = originalKey;
    }
  });
  it("prepares checkout instead of verifying an uninitialized deposit when its page is opened", async () => {
    const id = crypto.randomUUID();
    await user(id);
    const login = await auth().api.signInEmail({
      body: { email: `${id}@quickpay.test`, password: testPassword },
      headers: new Headers({ "x-forwarded-for": "127.0.0.17" }),
    });
    const p = await payment("deposit", "10000", id);
    const req = new Request(`http://localhost:3001/api/v1/payments/${p.id}`, {
      headers: { Authorization: `Bearer ${login.token}` },
    });
    await getPayment(req, p.id);
    const first = (
      await pool.query(
        "SELECT type FROM jobs WHERE payload->>'id'=$1 OR payload->>'reference'=$2",
        [p.id, p.reference],
      )
    ).rows;
    expect(first.map((row) => row.type)).toEqual(["process-payment"]);
    await pool.query(
      "UPDATE transactions SET status='awaiting_authorization',details=jsonb_build_object('checkoutUrl','https://checkout.paystack.com/ready') WHERE id=$1",
      [p.id],
    );
    await getPayment(req, p.id);
    expect(
      (
        await pool.query(
          "SELECT 1 FROM jobs WHERE type='verify-provider' AND payload->>'reference'=$1",
          [p.reference],
        )
      ).rowCount,
    ).toBe(1);
  });
  it("bank account review never creates a withdrawal and returns an account-specific error on rejection", async () => {
    const id = crypto.randomUUID();
    await user(id);
    const login = await auth().api.signInEmail({
      body: { email: `${id}@quickpay.test`, password: testPassword },
      headers: new Headers({ "x-forwarded-for": "127.0.0.18" }),
    });
    const config = env(),
      originalMode = config.PAYMENT_MODE,
      originalKey = config.PAYSTACK_SECRET_KEY;
    config.PAYMENT_MODE = "sandbox";
    config.PAYSTACK_SECRET_KEY = "sk_test_checkout_fixture";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: false }))
      .mockResolvedValueOnce(
        Response.json({
          status: true,
          data: {
            account_number: "1234567890",
            account_name: "VERIFIED RECIPIENT",
          },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const req = () =>
      new Request("http://localhost:3001/api/v1/banks/resolve", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${login.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bankCode: "999992",
          accountNumber: "1234567890",
        }),
      });
    try {
      await expect(resolveBank(req())).rejects.toMatchObject({
        code: "BANK_ACCOUNT_UNVERIFIED",
      });
      expect(await (await resolveBank(req())).json()).toMatchObject({
        name: "VERIFIED RECIPIENT",
      });
      expect(
        (await pool.query("SELECT 1 FROM transactions WHERE user_id=$1", [id]))
          .rowCount,
      ).toBe(0);
      expect(await balance(id)).toBe(0n);
      expect(
        fetcher.mock.calls.every((call) => call[1]?.method === "GET"),
      ).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      config.PAYMENT_MODE = originalMode;
      config.PAYSTACK_SECRET_KEY = originalKey;
    }
  });
});

describe("sandbox gift-card checkout", () => {
  it("quotes and confirms once without a wallet debit, isolates owners, expires quotes and hides demos outside sandbox", async () => {
    const config = env(),
      previous = config.PAYMENT_MODE;
    const buyer = crypto.randomUUID(),
      stranger = crypto.randomUUID();
    await user(buyer);
    await user(stranger);
    const login = await auth().api.signInEmail({
      body: { email: `${buyer}@quickpay.test`, password: testPassword },
    });
    const other = await auth().api.signInEmail({
      body: { email: `${stranger}@quickpay.test`, password: testPassword },
    });
    const req = (payload?: unknown, token = login.token) =>
      new Request("http://localhost:3001/api/v1/gift-cards/purchases", {
        method: payload ? "POST" : "GET",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
    try {
      config.PAYMENT_MODE = "sandbox";
      const catalog = await (await giftProducts(req())).json();
      expect(catalog.buyingAvailable).toBe(true);
      expect(
        catalog.products.some(
          (p: { id: string }) => p.id === "sandbox-apple-us",
        ),
      ).toBe(true);
      await expect(
        giftPurchases(
          req({ action: "quote", productId: "sandbox-apple-us", units: "501" }),
        ),
      ).rejects.toThrow("within the card limits");
      const quoted = await (
        await giftPurchases(
          req({ action: "quote", productId: "sandbox-apple-us", units: "10" }),
        )
      ).json();
      expect(quoted.purchase.amount).toBe("1000000");
      const confirmation = { action: "confirm", quoteId: quoted.purchase.id };
      await expect(
        giftPurchases(req(confirmation, other.token)),
      ).rejects.toThrow("not found");
      const results = await Promise.all([
        giftPurchases(req(confirmation)),
        giftPurchases(req(confirmation)),
      ]);
      for (const result of results)
        expect((await result.json()).demoCode).toContain(
          "DEMO-NOT-REDEEMABLE-",
        );
      expect(
        (await (await giftPurchases(req())).json()).purchases,
      ).toHaveLength(1);
      expect(await balance(buyer)).toBe(0n);
      const expired = await (
        await giftPurchases(
          req({ action: "quote", productId: "sandbox-apple-us", units: "10" }),
        )
      ).json();
      await pool.query(
        "UPDATE sandbox_gift_purchases SET expires_at=now()-interval '1 minute' WHERE id=$1",
        [expired.purchase.id],
      );
      await expect(
        giftPurchases(req({ action: "confirm", quoteId: expired.purchase.id })),
      ).rejects.toThrow("expired");
      const saleQuote = await (
        await giftQuote(req({ productId: "sandbox-apple-us", units: "10" }))
      ).json();
      const evidenceId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO evidence(id,user_id,file_path,mime,size) VALUES($1,$2,'sandbox-sample','image/png',100)",
        [evidenceId, buyer],
      );
      const sale = await (
        await giftSales(req({ quoteId: saleQuote.id, evidenceId }))
      ).json();
      expect(sale.id).toBeTruthy();
      expect(
        (
          await pool.query("SELECT status FROM gift_sales WHERE id=$1", [
            sale.id,
          ])
        ).rows[0].status,
      ).toBe("review");
      expect(await balance(buyer)).toBe(0n);
      config.PAYMENT_MODE = "disabled";
      expect(
        (await (await giftProducts(req())).json()).products.every(
          (p: { sandbox_only: boolean }) => !p.sandbox_only,
        ),
      ).toBe(true);
      await expect(giftPurchases(req())).rejects.toThrow("not available");
      await expect(
        giftQuote(req({ productId: "sandbox-apple-us", units: "10" })),
      ).rejects.toThrow("not available");
    } finally {
      config.PAYMENT_MODE = previous;
    }
  });
});
