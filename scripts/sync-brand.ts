import { copyFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "assets/brand/quick-pay-brand-pack-v1");
const target = path.join(root, "apps/web/public/brand");
await mkdir(target, { recursive: true });

// Publish the original bytes, including the manifest's matching /brand paths.
for (const name of await readdir(path.join(source, "website"))) {
  if (!/\.(svg|png|ico|webmanifest)$/.test(name)) continue;
  await copyFile(path.join(source, "website", name), path.join(target, name));
}
await mkdir(path.join(target, "mobile-headers"), { recursive: true });
for (const name of [
  "header-light.svg",
  "header-dark.svg",
  "compact-light.svg",
  "compact-dark.svg",
]) {
  await copyFile(
    path.join(source, "mobile-headers", name),
    path.join(target, "mobile-headers", name),
  );
}
// Serve the conventional /favicon.ico fallback via Next's file convention.
await copyFile(
  path.join(source, "website/favicon.ico"),
  path.join(root, "apps/web/src/app/favicon.ico"),
);
console.log("Quick Pay web branding synced from quick-pay-brand-pack-v1.");
