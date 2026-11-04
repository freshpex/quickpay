import { env } from "../apps/api/src/shared/infrastructure/env";
import { ConfigurationError } from "../apps/api/src/shared/errors";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
// Local commands deliberately use the root .env, including over stale shell values.
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
config({ path: envPath, override: true, quiet: true });
try {
  const settings = env();
  console.log(
    `Server configuration is valid. PAYMENT_MODE=${settings.PAYMENT_MODE}. Source: ${envPath}`,
  );
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(`Check these settings in .env: ${error.fields.join(", ")}.`);
    if (error.fields.includes("PAYMENT_MODE"))
      console.error(
        "PAYMENT_MODE must be disabled, sandbox or live. Use disabled until provider access is ready.",
      );
  } else
    console.error("Unable to read server configuration. Check your .env file.");
  process.exitCode = 1;
}
