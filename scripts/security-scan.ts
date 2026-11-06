import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
const version = "8.30.1";
const checksum =
  "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb";
let base: string | undefined;
for (const candidate of [
  process.argv[2] || process.env.SECRET_SCAN_BASE,
  "origin/main",
].filter(Boolean)) {
  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", "--end-of-options", `${candidate}^{commit}`],
    { encoding: "utf8" },
  );
  if (result.status === 0) {
    base = result.stdout.trim();
    break;
  }
}
if (!base)
  throw new Error("Fetch the target branch before scanning the commit range.");
let binary = process.env.GITLEAKS_BIN || resolve(".local/bin/gitleaks");
if (!existsSync(binary)) {
  const installed = spawnSync("gitleaks", ["version"], { encoding: "utf8" });
  if (installed.status === 0 && installed.stdout.trim() === version)
    binary = "gitleaks";
  else {
    if (process.platform !== "linux" || process.arch !== "x64")
      throw new Error(
        `Install gitleaks ${version} and set GITLEAKS_BIN to its executable.`,
      );
    mkdirSync(resolve(".local/bin"), { recursive: true });
    const archive = resolve(".local/bin/gitleaks.tar.gz");
    execFileSync(
      "curl",
      [
        "--fail",
        "--location",
        "--silent",
        "--show-error",
        "--retry",
        "3",
        "--output",
        archive,
        `https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_linux_x64.tar.gz`,
      ],
      { stdio: "inherit" },
    );
    if (
      createHash("sha256").update(readFileSync(archive)).digest("hex") !==
      checksum
    ) {
      rmSync(archive);
      throw new Error("Secret scanner checksum verification failed.");
    }
    execFileSync("tar", [
      "-xzf",
      archive,
      "-C",
      resolve(".local/bin"),
      "gitleaks",
    ]);
    rmSync(archive);
  }
}
if (execFileSync(binary, ["version"], { encoding: "utf8" }).trim() !== version)
  throw new Error(`Use gitleaks ${version} for reproducible scans.`);
const result = spawnSync(
  binary,
  ["git", "--redact=100", "--no-banner", "--log-opts", `${base}..HEAD`],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
