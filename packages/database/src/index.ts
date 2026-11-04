import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  options: "-c timezone=UTC -c statement_timeout=15000",
});
export const db = drizzle(pool, { schema });
export { schema };
export type Connection = pg.PoolClient;
export async function atomic<T>(fn: (c: Connection) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const value = await fn(c);
    await c.query("COMMIT");
    return value;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function enqueue(
  c: Pick<Connection, "query">,
  type: string,
  payload: unknown,
  dedupe: string,
  runAt = new Date(),
) {
  await c.query(
    "INSERT INTO jobs(id,type,payload,dedupe,run_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedupe) DO NOTHING",
    [crypto.randomUUID(), type, JSON.stringify(payload), dedupe, runAt],
  );
}
