import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { checkDeployment } from "./check-deployment";
import { supervise } from "./deployment-processes";

const component = process.argv[2];
checkDeployment(component);
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
async function migrate() {
  const code = await new Promise<number | null>((resolve, reject) => {
    const task = spawn(
      process.execPath,
      [require.resolve("tsx/cli"), "scripts/database-command.ts", "migrate"],
      { cwd: root, env: process.env, stdio: "inherit" },
    );
    task.on("error", reject);
    task.on("exit", resolve);
  });
  if (code !== 0)
    throw new Error(
      "Database migrations failed; refusing to start this service.",
    );
}
if (component !== "web") await migrate();
const appRoot = `${root}apps/${component}`;
const child =
  component === "worker"
    ? spawn(
        process.execPath,
        [require.resolve("tsx/cli"), "apps/worker/src/index.ts"],
        { cwd: root, env: process.env, stdio: "inherit" },
      )
    : spawn(
        process.execPath,
        [
          require.resolve("next/dist/bin/next", { paths: [appRoot] }),
          "start",
          "--hostname",
          "0.0.0.0",
          "--port",
          process.env.PORT || "10000",
        ],
        { cwd: appRoot, env: process.env, stdio: "inherit" },
      );
const children = [child];
if (component === "api" && process.env.RUN_WORKER_IN_API === "true") {
  children.push(
    spawn(
      process.execPath,
      [require.resolve("tsx/cli"), "apps/worker/src/index.ts"],
      { cwd: root, env: process.env, stdio: "inherit" },
    ),
  );
}
const stop = supervise(children, (code) => {
  process.exitCode = code;
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => stop(signal));
