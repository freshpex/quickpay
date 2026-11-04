import { pool, enqueue } from "@quickpay/database";
import { env } from "../../../../shared/infrastructure/env";
import { unseal } from "../../../../shared/infrastructure/security";
import { expoPush } from "../providers/expo-push";
export async function deliverPush(notificationId: string) {
  if (env().PUSH_ENABLED !== "true") return;
  const devices = await pool.query(
    "SELECT d.* FROM mobile_devices d JOIN notification_preferences p ON p.user_id=d.user_id AND p.push_enabled=true JOIN notifications n ON n.user_id=d.user_id WHERE n.id=$1 AND d.updated_at>now()-interval '90 days'",
    [notificationId],
  );
  for (const device of devices.rows)
    await enqueue(
      pool,
      "push-device",
      {
        notificationId,
        installationId: device.installation_id,
        tokenHash: device.token_hash,
      },
      `push-device:${notificationId}:${device.installation_id}:${device.token_hash}`,
    );
}
export async function deliverDevice(payload: Record<string, unknown>) {
  if (env().PUSH_ENABLED !== "true") return;
  const r = await pool.query(
    "SELECT d.* FROM mobile_devices d JOIN notifications n ON n.user_id=d.user_id JOIN notification_preferences p ON p.user_id=d.user_id AND p.push_enabled=true WHERE n.id=$1 AND d.installation_id=$2 AND d.token_hash=$3",
    [payload.notificationId, payload.installationId, payload.tokenHash],
  );
  if (!r.rowCount) return;
  const device = r.rows[0];
  const result = await expoPush("send", [
    {
      to: unseal(device.encrypted_token),
      title: "Quick Pay",
      body: "You have a new update. Open Quick Pay to view it.",
      data: { type: "notification", id: payload.notificationId },
      sound: "default",
      channelId: "updates",
      ttl: 3600,
    },
  ]);
  if (!Array.isArray(result) || result.length !== 1)
    throw new Error("PushResponseError");
  const ticket = result[0];
  if (ticket.status === "error") {
    if (ticket.details?.error === "DeviceNotRegistered") {
      await pool.query(
        "DELETE FROM mobile_devices WHERE installation_id=$1 AND token_hash=$2",
        [device.installation_id, device.token_hash],
      );
      return;
    }
    throw new Error("PushTicketError");
  }
  if (!ticket.id) throw new Error("PushTicketError");
  await pool.query(
    "INSERT INTO push_tickets(id,installation_id,token_hash) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [ticket.id, device.installation_id, device.token_hash],
  );
  await enqueue(
    pool,
    "push-receipt",
    { id: ticket.id },
    `push-receipt:${ticket.id}`,
    new Date(Date.now() + 15 * 60000),
  );
}
export async function checkPushReceipt(id: string) {
  if (env().PUSH_ENABLED !== "true") return;
  const r = await pool.query("SELECT * FROM push_tickets WHERE id=$1", [id]);
  if (!r.rowCount) return;
  const result = await expoPush("getReceipts", { ids: [id] });
  if (Array.isArray(result) || !result[id])
    throw new Error("PushReceiptPending");
  if (result[id].details?.error === "DeviceNotRegistered")
    await pool.query(
      "DELETE FROM mobile_devices WHERE installation_id=$1 AND token_hash=$2",
      [r.rows[0].installation_id, r.rows[0].token_hash],
    );
  else if (result[id].status === "error") throw new Error("PushReceiptError");
  await pool.query("DELETE FROM push_tickets WHERE id=$1", [id]);
}
