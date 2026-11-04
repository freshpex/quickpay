export {};
const deploymentOrigin = new URL(process.argv[2] || "");
if (
  deploymentOrigin.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(deploymentOrigin.hostname)
)
  throw new Error("Use the public HTTPS website URL.");
for (const path of [
  "/",
  "/healthz",
  "/api/v1/health",
  "/api/v1/health/worker",
]) {
  const response = await fetch(new URL(path, deploymentOrigin), {
    signal: AbortSignal.timeout(30000),
  });
  console.log(`${response.status} ${path}`);
  if (!response.ok) process.exitCode = 1;
}
