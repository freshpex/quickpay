import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool, atomic } from "./index";
await pool.query(
  "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
);
const folder = fileURLToPath(new URL("../migrations/", import.meta.url));
for (const name of (await readdir(folder))
  .filter((n) => n.endsWith(".sql"))
  .sort()) {
  await atomic(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(74001)");
    if (
      (await c.query("SELECT 1 FROM schema_migrations WHERE name=$1", [name]))
        .rowCount
    )
      return;
    await c.query(await readFile(`${folder}/${name}`, "utf8"));
    await c.query("INSERT INTO schema_migrations(name) VALUES($1)", [name]);
    console.log(`Applied ${name}`);
  });
}
await pool.end();
