import "./check-config";
import { spawn } from "node:child_process";
if (!process.exitCode) {
  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error("Use npm run dev or pnpm dev.");
  // npm run dev also supports this launcher; invoke pnpm through its executable.
  const child = pnpm.toLowerCase().includes("pnpm")
    ? spawn(
        process.execPath,
        [
          pnpm,
          "--parallel",
          "--filter",
          "@quickpay/web",
          "--filter",
          "@quickpay/api",
          "--filter",
          "@quickpay/worker",
          "dev",
        ],
        { env: process.env, stdio: "inherit" },
      )
    : spawn(
        "pnpm",
        [
          "--parallel",
          "--filter",
          "@quickpay/web",
          "--filter",
          "@quickpay/api",
          "--filter",
          "@quickpay/worker",
          "dev",
        ],
        {
          env: process.env,
          stdio: "inherit",
          shell: process.platform === "win32",
        },
      );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => child.kill(signal));
  child.on("exit", (code) => {
    process.exitCode = code || 0;
  });
}
