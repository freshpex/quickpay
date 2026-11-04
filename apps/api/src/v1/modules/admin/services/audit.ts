import type { Connection } from "@quickpay/database";
export async function audit(
  c: Pick<Connection, "query">,
  actor: string,
  action: string,
  resource: string,
  before: unknown,
  after: unknown,
  correlationId = crypto.randomUUID(),
) {
  await c.query(
    "INSERT INTO audit_events(id,actor_id,action,resource,before_value,after_value,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      crypto.randomUUID(),
      actor,
      action,
      resource,
      JSON.stringify(before),
      JSON.stringify(after),
      correlationId,
    ],
  );
}
