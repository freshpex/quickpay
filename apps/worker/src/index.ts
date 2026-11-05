import "dotenv/config";
import { pool, atomic, enqueue } from "@quickpay/database";
import { sendEmail } from "../../api/src/shared/infrastructure/email";
import {
  processPayment,
  verifyPayment,
} from "../../api/src/v1/modules/payments/jobs/process-payment";
import { releaseRewards } from "../../api/src/v1/modules/rewards/services/rewards";
import { env } from "../../api/src/shared/infrastructure/env";
import { jobError } from "./job-error";
import type { PaymentRow } from "../../api/src/v1/modules/payments/repositories/payment.repository";
import {
  deliverPush,
  deliverDevice,
  checkPushReceipt,
} from "../../api/src/v1/modules/notifications/jobs/deliver-push";
let stopping = false;
let lastHeartbeat = 0;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function schedule() {
  const bucket = Math.floor(Date.now() / 60000);
  await enqueue(pool, "reconcile", {}, `reconcile:${bucket}`);
  await enqueue(pool, "release-rewards", {}, `rewards:${bucket}`);
}
async function run(type: string, payload: Record<string, unknown>) {
  if (type === "push-notification")
    return deliverPush(String(payload.notificationId));
  if (type === "push-device") return deliverDevice(payload);
  if (type === "push-receipt") return checkPushReceipt(String(payload.id));
  if (type === "process-payment") return processPayment(String(payload.id));
  if (type === "release-rewards") return atomic(releaseRewards);
  if (type === "verify-provider") {
    if (!payload.reference) return;
    const r = await pool.query<PaymentRow>(
      "SELECT * FROM transactions WHERE reference=$1",
      [payload.reference],
    );
    if (r.rowCount) {
      await verifyPayment(r.rows[0]);
      await pool.query("UPDATE transactions SET updated_at=now() WHERE id=$1", [
        r.rows[0].id,
      ]);
    }
    return;
  }
  if (type === "reconcile") {
    const r = await pool.query<PaymentRow>(
      "SELECT * FROM transactions WHERE (status IN ('processing','awaiting_authorization') OR (status='successful' AND kind IN ('payment','withdrawal') AND created_at>now()-interval '7 days') OR (kind='deposit' AND status IN ('failed','cancelled') AND created_at>now()-interval '7 days')) AND updated_at<now()-interval '1 minute' ORDER BY updated_at LIMIT 100",
    );
    for (const p of r.rows)
      await enqueue(
        pool,
        p.kind === "deposit" &&
          p.status === "processing" &&
          !p.details.checkoutUrl
          ? "process-payment"
          : "verify-provider",
        p.kind === "deposit" &&
          p.status === "processing" &&
          !p.details.checkoutUrl
          ? { id: p.id }
          : { reference: p.reference },
        `requery:${p.id}:${Math.floor(Date.now() / 300000)}`,
      );
    return;
  }
  if (type === "email") {
    await sendEmail(payload);
    return;
  }
  if (type === "receipt") {
    return;
  } // In-app receipt is generated from the persisted transaction, no duplicated email.
  throw new Error("Unsupported job type");
}
async function tick() {
  if (Date.now() - lastHeartbeat >= 30000) {
    await pool.query(
      "INSERT INTO worker_heartbeats(name,last_seen_at) VALUES('main',now()) ON CONFLICT(name) DO UPDATE SET last_seen_at=now()",
    );
    lastHeartbeat = Date.now();
  }
  await schedule();
  const token = crypto.randomUUID();
  const job = await atomic(async (c) => {
    const r = await c.query(
      "SELECT id FROM jobs WHERE (status='queued' AND run_at<=now()) OR (status='running' AND lease_until<now()) ORDER BY run_at FOR UPDATE SKIP LOCKED LIMIT 1",
    );
    if (!r.rowCount) return null;
    return (
      await c.query(
        "UPDATE jobs SET status='running',lease_until=now()+interval '90 seconds',lease_token=$2,attempts=attempts+1 WHERE id=$1 RETURNING *",
        [r.rows[0].id, token],
      )
    ).rows[0];
  });
  if (!job) return false;
  const heartbeat = setInterval(() => {
    void pool
      .query(
        "UPDATE jobs SET lease_until=now()+interval '90 seconds' WHERE id=$1 AND lease_token=$2",
        [job.id, token],
      )
      .catch(() => {});
  }, 20000);
  try {
    await run(job.type, job.payload);
    await pool.query(
      "UPDATE jobs SET status='completed',lease_until=NULL WHERE id=$1 AND lease_token=$2",
      [job.id, token],
    );
  } catch (error) {
    const failed = job.attempts >= 8;
    await pool.query(
      "UPDATE jobs SET status=$3,run_at=now()+($4::int*interval '1 second'),lease_until=NULL,last_error=$5 WHERE id=$1 AND lease_token=$2",
      [
        job.id,
        token,
        failed ? "failed" : "queued",
        Math.min(3600, 2 ** job.attempts * 5),
        error instanceof Error ? error.name : "Error",
      ],
    );
    const operation = ["process-payment", "verify-provider"].includes(job.type)
      ? await pool
          .query(
            "SELECT kind FROM transactions WHERE id::text=$1 OR reference=$2 LIMIT 1",
            [
              typeof job.payload?.id === "string" ? job.payload.id : null,
              typeof job.payload?.reference === "string"
                ? job.payload.reference
                : null,
            ],
          )
          .then((result) => result.rows[0]?.kind)
          .catch(() => undefined)
      : undefined;
    console.error(
      JSON.stringify({
        event: failed ? "job_failed" : "job_retry",
        jobId: job.id,
        type: job.type,
        operation,
        ...jobError(error),
      }),
    );
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
console.log(
  JSON.stringify({ event: "worker_started", mode: env().PAYMENT_MODE }),
);
let databaseFailures = 0;
while (!stopping) {
  try {
    if (!(await tick())) await new Promise((r) => setTimeout(r, 1000));
    databaseFailures = 0;
  } catch {
    console.error(JSON.stringify({ event: "worker_database_unavailable" }));
    if (++databaseFailures >= 12) {
      console.error(
        JSON.stringify({ event: "worker_stopped_after_database_failures" }),
      );
      process.exitCode = 1;
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}
await pool.end();
