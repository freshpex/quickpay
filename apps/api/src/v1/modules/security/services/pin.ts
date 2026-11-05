import { newTransactionPin } from "@quickpay/contracts";
import { randomInt, createHmac, timingSafeEqual } from "node:crypto";
import { atomic, pool, type Connection } from "@quickpay/database";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { assert } from "../../../../shared/errors";
import { env } from "../../../../shared/infrastructure/env";
import { seal } from "../../../../shared/infrastructure/security";
import { queueUserEmail } from "../../../../shared/infrastructure/email/queue";
type PinRow = {
  pin_hash: string;
  failed_attempts: number;
  locked_until: Date | null;
  updated_at: Date;
};
const problem = (code: string, message: string) => ({ code, message });
const pinSecret = (userId: string, pin: string) =>
  createHmac("sha256", env().BETTER_AUTH_SECRET)
    .update(`transaction-pin:${userId}:${pin}`)
    .digest("hex");
async function check(
  c: Pick<Connection, "query">,
  userId: string,
  pin: string,
  row?: PinRow,
) {
  if (!row)
    return problem(
      "PIN_REQUIRED",
      "Set up your transaction PIN before continuing.",
    );
  if (row.locked_until && row.locked_until.getTime() > Date.now())
    return problem(
      "PIN_LOCKED",
      "Your PIN is locked for 15 minutes. Wait or reset it in Security settings.",
    );
  if (
    !(await verifyPassword({
      password: pinSecret(userId, pin),
      hash: row.pin_hash,
    }))
  ) {
    const attempts = row.locked_until ? 1 : row.failed_attempts + 1;
    await c.query(
      "UPDATE transaction_pins SET failed_attempts=$2,locked_until=CASE WHEN $2>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE user_id=$1",
      [userId, attempts],
    );
    if (attempts >= 5)
      await queueUserEmail(
        c,
        userId,
        "Transaction PIN locked",
        "Five incorrect PIN attempts locked your transaction PIN for 15 minutes. If this was not you, reset your PIN in Security settings.",
        `pin-locked:${userId}:${Date.now()}`,
      );
    return attempts >= 5
      ? problem(
          "PIN_LOCKED",
          "Your PIN is locked for 15 minutes. Reset it in Security settings if needed.",
        )
      : problem(
          "PIN_INCORRECT",
          "Your transaction PIN is incorrect. Please try again.",
        );
  }
  await c.query(
    "UPDATE transaction_pins SET failed_attempts=0,locked_until=NULL WHERE user_id=$1",
    [userId],
  );
}
function ensure(result: ReturnType<typeof problem> | undefined) {
  assert(
    !result,
    result?.code || "PIN_INCORRECT",
    result?.message || "Check your PIN.",
    403,
  );
}
export async function verifyTransactionPin(userId: string, pin: string) {
  const result = await atomic(async (c) => {
    const {
      rows: [row],
    } = await c.query<PinRow>(
      "SELECT * FROM transaction_pins WHERE user_id=$1 FOR UPDATE",
      [userId],
    );
    return check(c, userId, pin, row);
  });
  ensure(result);
}
export async function checkAccountPassword(userId: string, password: string) {
  const {
    rows: [account],
  } = await pool.query(
    "SELECT password FROM auth_accounts WHERE user_id=$1 AND provider_id='credential'",
    [userId],
  );
  assert(
    account?.password &&
      (await verifyPassword({ password, hash: account.password })),
    "AUTHORIZATION_FAILED",
    "Your current login password is incorrect. Please try again.",
    403,
  );
}
export async function setTransactionPin(
  userId: string,
  pin: string,
  currentPin?: string,
) {
  pin = newTransactionPin.parse(pin);
  const hash = await hashPassword(pinSecret(userId, pin));
  const result = await atomic(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,13))", [
      userId,
    ]);
    const {
      rows: [old],
    } = await c.query<PinRow>(
      "SELECT * FROM transaction_pins WHERE user_id=$1 FOR UPDATE",
      [userId],
    );
    if (old) {
      const error = await check(c, userId, currentPin || "", old);
      if (error) return error;
    }
    await c.query(
      "INSERT INTO transaction_pins(user_id,pin_hash) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET pin_hash=$2,failed_attempts=0,locked_until=NULL,updated_at=now()",
      [userId, hash],
    );
    await queueUserEmail(
      c,
      userId,
      old ? "Transaction PIN changed" : "Transaction PIN set",
      `Your Quick Pay transaction PIN was ${old ? "changed" : "set up"}. Your PIN is required for deposits, transfers and payments. We will never include it in an email.`,
      `pin-set:${crypto.randomUUID()}`,
    );
  });
  ensure(result);
}
const otpHash = (userId: string, code: string) =>
  createHmac("sha256", env().BETTER_AUTH_SECRET)
    .update(`pin-reset:${userId}:${code}`)
    .digest("hex");
export async function requestPinReset(userId: string) {
  const code = String(randomInt(100000, 1000000));
  await atomic(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,14))", [
      userId,
    ]);
    const {
      rows: [old],
    } = await c.query(
      "SELECT created_at FROM pin_reset_challenges WHERE user_id=$1",
      [userId],
    );
    assert(
      !old || Date.now() - old.created_at.getTime() >= 60000,
      "RATE_LIMIT",
      "Wait a minute before requesting another code.",
      429,
    );
    await c.query(
      "INSERT INTO pin_reset_challenges(user_id,code_hash,expires_at) VALUES($1,$2,now()+interval '10 minutes') ON CONFLICT(user_id) DO UPDATE SET code_hash=$2,expires_at=now()+interval '10 minutes',attempts=0,created_at=now()",
      [userId, otpHash(userId, code)],
    );
    await queueUserEmail(
      c,
      userId,
      "Reset your transaction PIN",
      "Your PIN reset code is {{code}}. It expires in 10 minutes and can be used once. Never share this code.",
      `pin-reset-code:${crypto.randomUUID()}`,
      { otpEncrypted: seal(code) },
    );
  });
}
export async function resetTransactionPin(
  userId: string,
  code: string,
  pin: string,
) {
  pin = newTransactionPin.parse(pin);
  const hash = await hashPassword(pinSecret(userId, pin));
  const result = await atomic(async (c) => {
    const {
      rows: [challenge],
    } = await c.query(
      "SELECT * FROM pin_reset_challenges WHERE user_id=$1 FOR UPDATE",
      [userId],
    );
    if (
      !challenge ||
      challenge.expires_at.getTime() < Date.now() ||
      challenge.attempts >= 5
    )
      return problem(
        "OTP_INVALID",
        "This code expired or has too many attempts. Request a new code.",
      );
    const expected = Buffer.from(otpHash(userId, code), "hex"),
      actual = Buffer.from(challenge.code_hash, "hex");
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(expected, actual)
    ) {
      await c.query(
        "UPDATE pin_reset_challenges SET attempts=attempts+1 WHERE user_id=$1",
        [userId],
      );
      return problem(
        "OTP_INVALID",
        "That code is incorrect. Please try again.",
      );
    }
    await c.query(
      "INSERT INTO transaction_pins(user_id,pin_hash) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET pin_hash=$2,failed_attempts=0,locked_until=NULL,updated_at=now()",
      [userId, hash],
    );
    await c.query("DELETE FROM pin_reset_challenges WHERE user_id=$1", [
      userId,
    ]);
    await queueUserEmail(
      c,
      userId,
      "Transaction PIN reset",
      "Your transaction PIN was reset. If this was not you, secure your account and contact Quick Pay support.",
      `pin-reset:${crypto.randomUUID()}`,
    );
  });
  ensure(result);
}
