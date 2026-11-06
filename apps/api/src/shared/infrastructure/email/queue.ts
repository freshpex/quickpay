import { enqueue, type Connection } from "@quickpay/database";
export async function queueUserEmail(
  c: Pick<Connection, "query">,
  userId: string,
  subject: string,
  text: string,
  key: string,
  extra: Record<string, unknown> = {},
) {
  const {
    rows: [user],
  } = await c.query("SELECT email FROM users WHERE id=$1", [userId]);
  if (user)
    await enqueue(c, "email", { to: user.email, subject, text, ...extra }, key);
}

export async function queueSecurityEmail(
  userId: string,
  subject: string,
  text: string,
  key: string,
) {
  const { pool } = await import("@quickpay/database");
  try {
    await queueUserEmail(pool, userId, subject, text, key);
  } catch {
    console.error(
      JSON.stringify({ event: "security_email_queue_failed", userId }),
    );
  }
}
