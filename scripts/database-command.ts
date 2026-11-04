import "dotenv/config";
import { maintenanceDatabaseUrl } from "./database-url";
const command = process.argv[2];
if (!["migrate", "seed"].includes(command))
  throw new Error("Choose migrate or seed.");
process.env.DATABASE_URL = maintenanceDatabaseUrl(process.env);
if (command === "migrate") await import("../packages/database/src/migrate");
else await import("../packages/database/src/seed");
