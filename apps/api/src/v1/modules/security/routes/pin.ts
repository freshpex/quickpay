import { z } from "zod";
import { newTransactionPin, transactionPin } from "@quickpay/contracts";
import { pool } from "@quickpay/database";
import { identity } from "../../../../shared/auth";
import { assert } from "../../../../shared/errors";
import { body, json, rateLimit } from "../../../../shared/infrastructure/http";
import {
  checkAccountPassword,
  setTransactionPin,
  requestPinReset,
  resetTransactionPin,
} from "../services/pin";
export async function pinSettings(req: Request) {
  const s = await identity(req);
  if (req.method === "GET") {
    const {
      rows: [row],
    } = await pool.query(
      "SELECT locked_until FROM transaction_pins WHERE user_id=$1",
      [s.user.id],
    );
    return json({ configured: !!row, lockedUntil: row?.locked_until || null });
  }
  assert(
    s.user.emailVerified,
    "VERIFY_CONTACT",
    "Verify your email before setting a transaction PIN.",
    403,
  );
  await rateLimit(`pin-settings:${s.user.id}`, 5);
  const value = await body(
    req,
    z
      .object({
        password: z.string().min(1),
        newPin: newTransactionPin,
        confirmPin: z.string(),
        currentPin: transactionPin.optional(),
      })
      .refine((v) => v.newPin === v.confirmPin, {
        path: ["confirmPin"],
        message: "Your PINs do not match.",
      }),
  );
  await checkAccountPassword(s.user.id, value.password);
  await setTransactionPin(s.user.id, value.newPin, value.currentPin);
  return json({ message: "Your transaction PIN is ready." });
}
export async function pinReset(req: Request) {
  const s = await identity(req);
  assert(
    s.user.emailVerified,
    "VERIFY_CONTACT",
    "Verify your email before resetting your PIN.",
    403,
  );
  await rateLimit(`pin-reset:${s.user.id}`, 5);
  const value = await body(
    req,
    z
      .object({
        password: z.string().min(1),
        code: z
          .string()
          .regex(/^\d{6}$/, "Enter the six-digit code sent to your email.")
          .optional(),
        newPin: newTransactionPin.optional(),
        confirmPin: z.string().optional(),
      })
      .refine((v) => !v.code || (!!v.newPin && v.newPin === v.confirmPin), {
        path: ["confirmPin"],
        message: "Enter and confirm your new PIN.",
      }),
  );
  await checkAccountPassword(s.user.id, value.password);
  if (!value.code) {
    await requestPinReset(s.user.id);
    return json({
      message: "A reset code has been sent to your verified email.",
    });
  }
  await resetTransactionPin(s.user.id, value.code, value.newPin!);
  return json({ message: "Your transaction PIN has been reset." });
}
