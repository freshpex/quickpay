import { afterAll, beforeAll, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { staticWebServer } from "../scripts/static-web-server";
let directory: string;
let web: Server;
let api: Server;
let origin: string;
async function listen(server: Server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "quickpay-static-test-"));
  await mkdir(join(directory, "sign-in"));
  await mkdir(join(directory, "transactions/detail"), { recursive: true });
  await writeFile(join(directory, "index.html"), "Home");
  await writeFile(join(directory, "opengraph-image"), "image bytes");
  await writeFile(join(directory, "sign-in/index.html"), "Sign in");
  await writeFile(join(directory, "sign-in/__next._tree.txt"), "Route data");
  await writeFile(join(directory, "transactions/detail/index.html"), "Receipt");
  api = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    res.writeHead(201, { "Set-Cookie": "session=updated; HttpOnly; Path=/" });
    res.end(
      JSON.stringify({
        method: req.method,
        url: req.url,
        cookie: req.headers.cookie,
        body,
      }),
    );
  });
  const apiOrigin = await listen(api);
  web = staticWebServer(directory, apiOrigin);
  origin = await listen(web);
});
afterAll(async () => {
  await Promise.all(
    [web, api].map(
      (server) =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        ),
    ),
  );
  await rm(directory, { recursive: true });
});
it("serves exported pages and route data without an API request", async () => {
  expect(await (await fetch(`${origin}/sign-in`)).text()).toBe("Sign in");
  const route = await fetch(`${origin}/sign-in/__next._tree.txt`);
  expect(route.headers.get("Content-Type")).toContain("text/plain");
  expect(await route.text()).toBe("Route data");
  expect((await fetch(`${origin}/sign-in/`, { method: "HEAD" })).status).toBe(
    200,
  );
  expect(await (await fetch(`${origin}/transactions/receipt-id`)).text()).toBe(
    "Receipt",
  );
  expect(
    (await fetch(`${origin}/opengraph-image`)).headers.get("Content-Type"),
  ).toBe("image/png");
  expect((await fetch(`${origin}/missing.js`)).status).toBe(404);
  expect((await fetch(`${origin}/..%2Foutside`)).status).toBe(404);
});
it("proxies API methods, query strings, bodies and session cookies", async () => {
  const response = await fetch(
    `${origin}/api/v1/auth/sign-in/email?source=test`,
    {
      method: "POST",
      headers: { Cookie: "session=original" },
      body: "credentials",
    },
  );
  expect(response.status).toBe(201);
  expect(response.headers.get("Set-Cookie")).toContain("session=updated");
  expect(await response.json()).toEqual({
    method: "POST",
    url: "/api/v1/auth/sign-in/email?source=test",
    cookie: "session=original",
    body: "credentials",
  });
});
