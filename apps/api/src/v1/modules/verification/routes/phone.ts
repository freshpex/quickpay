import { z } from "zod";
import { pool, atomic } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { body, json, rateLimit } from "../../../../shared/infrastructure/http";
import { seal, unseal } from "../../../../shared/infrastructure/security";
import { assert } from "../../../../shared/errors";
import { sendPhoneCode, verifyPhoneCode } from "../providers/termii";
export async function sendCode(req: Request) {
  const s = await identity(req);
  assert(
    s.user.emailVerified,
    "VERIFY_EMAIL",
    "Verify your email before checking your phone.",
    403,
  );
  await rateLimit(`sms-send:${s.user.id}`, 2);
  const {
    rows: [u],
  } = await pool.query(
    "SELECT phone_number,phone_verified FROM users WHERE id=$1",
    [s.user.id],
  );
  assert(
    !u.phone_verified,
    "ALREADY_VERIFIED",
    "Your phone number is already verified.",
    409,
  );
  const reference = await sendPhoneCode(u.phone_number),
    id = crypto.randomUUID();
  await atomic(async (c) => {
    await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [s.user.id]);
    await c.query(
      "UPDATE phone_challenges SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL",
      [s.user.id],
    );
    await c.query(
      "INSERT INTO phone_challenges(id,user_id,provider_reference,phone_number,expires_at) VALUES($1,$2,$3,$4,now()+interval '5 minutes')",
      [id, s.user.id, seal(reference), u.phone_number],
    );
  });
  return json({
    id,
    message: "We sent a code to your phone. It expires in five minutes.",
  });
}
export async function verifyCode(req: Request) {
  const s = await identity(req);
  await rateLimit(`sms-verify:${s.user.id}`, 5);
  const v = await body(
    req,
    z.object({ id: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }),
  );
  const {
    rows: [challenge],
  } = await pool.query(
    "UPDATE phone_challenges SET attempts=attempts+1 WHERE id=$1 AND user_id=$2 AND consumed_at IS NULL AND expires_at>now() AND attempts<3 RETURNING *",
    [v.id, s.user.id],
  );
  assert(challenge, "CODE_EXPIRED", "Request a new code and try again.", 409);
  const valid = await verifyPhoneCode(
    unseal(challenge.provider_reference),
    v.code,
    challenge.phone_number,
  );
  assert(valid, "INVALID_CODE", "That code is incorrect or has expired.");
  await atomic(async (c) => {
    const consumed = await c.query(
      "UPDATE phone_challenges SET consumed_at=now() WHERE id=$1 AND consumed_at IS NULL AND expires_at>now() RETURNING id",
      [v.id],
    );
    assert(
      consumed.rowCount,
      "CODE_EXPIRED",
      "Request a new code and try again.",
      409,
    );
    assert(
      (
        await c.query(
          "UPDATE users SET phone_verified=true,updated_at=now() WHERE id=$1 AND phone_number=$2",
          [s.user.id, challenge.phone_number],
        )
      ).rowCount,
      "PHONE_CHANGED",
      "Your phone number changed. Request a new code.",
      409,
    );
  });
  return json({ message: "Your phone number is verified." });
}
