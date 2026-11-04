import { copyFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pack = resolve(root, "assets/brand/quick-pay-brand-pack-v1");
const files: Record<string, string> = {
  "mobile-headers/header-light@3x.png": "header-light.png",
  "mobile-headers/header-dark@3x.png": "header-dark.png",
  "mobile-headers/compact-light@3x.png": "symbol.png",
  "mobile-headers/compact-dark@3x.png": "symbol-white.png",
  "apple/app-store-1024.png": "apple-icon.png",
  "app-icons/app-icon-dark-1024.png": "apple-dark.png",
  "android/google-play-512.png": "android-icon.png",
  "android/adaptive/foreground-432.png": "android-foreground.png",
  "android/adaptive/monochrome-432.png": "android-monochrome.png",
};
const dest = resolve(root, "apps/mobile/assets/brand");
await mkdir(dest, { recursive: true });
for (const [source, name] of Object.entries(files))
  await copyFile(resolve(pack, source), resolve(dest, name));
console.log("Quick Pay mobile branding synced from the original pack.");
