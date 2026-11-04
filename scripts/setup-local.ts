import { randomBytes } from "node:crypto";
import { readFile, writeFile, access } from "node:fs/promises";
let source = await readFile(".env.example", "utf8");
try {
  source = await readFile(".env", "utf8");
} catch {
  source = source
    .replace(
      "replace-with-at-least-32-random-characters",
      randomBytes(32).toString("hex"),
    )
    .replace("replace-with-64-hex-characters", randomBytes(32).toString("hex"))
    .replace("SEED_DEVELOPMENT=false", "SEED_DEVELOPMENT=true");
  await writeFile(".env", source, { flag: "wx" });
}
for (const app of ["web", "api"]) {
  const path = `apps/${app}/.env.local`;
  try {
    await access(path);
  } catch {
    await writeFile(path, source, { flag: "wx" });
  }
}
console.log(
  "Local server configuration is ready. No existing environment file was overwritten.",
);
