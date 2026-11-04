import { atomic, enqueue } from "@quickpay/database";
import { z } from "zod";
import { env } from "../../../../shared/infrastructure/env";
import { json } from "../../../../shared/infrastructure/http";
import { assert } from "../../../../shared/errors";
import { validPaystackSignature } from "../providers/paystack";
import { hash } from "../../../../shared/infrastructure/security";
export async function paystackWebhook(req: Request) {
  const raw = await req.text();
  assert(raw.length <= 262144, "TOO_LARGE", "Request too large.", 413);
  assert(
    env().PAYSTACK_SECRET_KEY &&
      validPaystackSignature(
        raw,
        req.headers.get("x-paystack-signature"),
        env().PAYSTACK_SECRET_KEY!,
      ),
    "INVALID_SIGNATURE",
    "Webhook authentication failed.",
    401,
  );
  const event = z
    .object({
      event: z.string(),
      data: z
        .object({
          reference: z.string().optional(),
          id: z.union([z.string(), z.number()]).optional(),
        })
        .passthrough(),
    })
    .parse(JSON.parse(raw));
  await atomic(async (c) => {
    const key = hash(event);
    const result = await c.query(
      "INSERT INTO webhook_events(id,provider,event_key,payload) VALUES($1,'paystack',$2,$3) ON CONFLICT DO NOTHING RETURNING id",
      [
        crypto.randomUUID(),
        key,
        JSON.stringify({
          event: event.event,
          reference: event.data.reference,
          id: event.data.id,
        }),
      ],
    );
    if (result.rowCount)
      await enqueue(
        c,
        "verify-provider",
        { reference: event.data.reference, event: event.event },
        `webhook:${key}`,
      );
  });
  return json({ received: true });
}
