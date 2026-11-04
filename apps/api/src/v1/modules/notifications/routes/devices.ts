import { atomic, pool } from "@quickpay/database";
import { z } from "zod";
import { identity } from "../../../../shared/auth";
import { json, body, rateLimit } from "../../../../shared/infrastructure/http";
import { env } from "../../../../shared/infrastructure/env";
import { hash, seal } from "../../../../shared/infrastructure/security";
import { assert } from "../../../../shared/errors";
export const deviceSchema = z.object({installationId: z.string().uuid(), token: z.string().regex(/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/).max(256), platform: z.enum(["ios", "android"])});
export async function preferences(req: Request) {
  const s = await identity(req);
  if (req.method === "PATCH") {
    const v = await body(req, z.object({pushEnabled: z.boolean()}));
    assert(!v.pushEnabled || env().PUSH_ENABLED === "true", "PUSH_UNAVAILABLE", "Push notifications are currently unavailable. Your updates remain in the app.", 503);
    await pool.query("INSERT INTO notification_preferences(user_id,push_enabled) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET push_enabled=$2,updated_at=now()", [s.user.id, v.pushEnabled]);
  }
  const r = await pool.query("SELECT push_enabled FROM notification_preferences WHERE user_id=$1", [s.user.id]);
  return json({pushAvailable: env().PUSH_ENABLED === "true", pushEnabled: r.rows[0]?.push_enabled ?? false});
}
export async function devices(req: Request) {
  const s = await identity(req);
  await rateLimit(`device:${s.user.id}`, 20);
  if (req.method === "DELETE") {
    const v = await body(req, z.object({installationId: z.string().uuid()}));
    await pool.query("DELETE FROM mobile_devices WHERE installation_id=$1 AND user_id=$2", [v.installationId, s.user.id]);
    return json({message: "Device notifications removed."});
  }
  assert(env().PUSH_ENABLED === "true", "PUSH_UNAVAILABLE", "Push notifications are currently unavailable.", 503);
  const v = await body(req, deviceSchema);
  await atomic(async c => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [hash(v.token)]);
    await c.query("DELETE FROM mobile_devices WHERE token_hash=$1 AND installation_id<>$2", [hash(v.token), v.installationId]);
    await c.query("INSERT INTO mobile_devices(installation_id,user_id,token_hash,encrypted_token,platform) VALUES($1,$2,$3,$4,$5) ON CONFLICT(installation_id) DO UPDATE SET user_id=$2,token_hash=$3,encrypted_token=$4,platform=$5,updated_at=now()", [v.installationId, s.user.id, hash(v.token), seal(v.token), v.platform]);
  });
  return json({message: "Device registered."});
}
