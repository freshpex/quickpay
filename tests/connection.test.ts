import { afterEach, expect, it, vi } from "vitest";
import {
  createConnectionRecovery,
  ConnectionUnavailable,
  ConnectionInterrupted,
  ConnectionOffline,
} from "../packages/api-client/src/connection";
const health = "https://api.example/api/v1/health";
afterEach(() => vi.useRealTimers());
it("shares one cold-start probe across reads and signup; posts only once after readiness", async () => {
  vi.useFakeTimers();
  let awake = false;
  const send = vi.fn(async (input: RequestInfo | URL) =>
    String(input) === health
      ? awake
        ? Response.json({ status: "ok" })
        : new Response("Starting", { status: 503 })
      : Response.json({ received: true }),
  );
  const connection = createConnectionRecovery({
    healthUrl: health,
    fetcher: send,
    retryMs: 1000,
  });
  const first = connection.fetch("https://api.example/api/v1/wallet");
  const second = connection.fetch(
    "https://api.example/api/v1/auth/sign-up/email",
    { method: "POST", body: "private form" },
  );
  await vi.advanceTimersByTimeAsync(600);
  expect(connection.getSnapshot().phase).toBe("connecting");
  expect(send.mock.calls).toHaveLength(1);
  awake = true;
  await vi.advanceTimersByTimeAsync(500);
  await Promise.all([first, second]);
  expect(
    send.mock.calls.filter(([url]) => String(url).includes("sign-up")),
  ).toHaveLength(1);
  expect(
    send.mock.calls.filter(([url]) => String(url) === health),
  ).toHaveLength(2);
  expect(connection.getSnapshot().phase).toBe("ready");
});
it("recovers a safe read when an already-connected API sleeps", async () => {
  let reads = 0;
  const send = vi.fn(async (input: RequestInfo | URL) =>
    String(input) === health
      ? Response.json({ status: "ok" })
      : ++reads === 1
        ? new Response("Waking", { status: 503 })
        : Response.json({ balance: "0" }),
  );
  const connection = createConnectionRecovery({
    healthUrl: health,
    fetcher: send,
  });
  expect(
    await (await connection.fetch("https://api.example/api/v1/wallet")).json(),
  ).toEqual({ balance: "0" });
  expect(reads).toBe(2);
});
it("never replays a money-moving submission after a gateway or network interruption", async () => {
  for (const networkFailure of [false, true]) {
    let posts = 0;
    const send = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === health) return Response.json({ status: "ok" });
      posts++;
      if (networkFailure) throw new TypeError("Network lost");
      return new Response("Waking", { status: 502 });
    });
    const connection = createConnectionRecovery({
      healthUrl: health,
      fetcher: send,
    });
    await expect(
      connection.fetch("https://api.example/api/v1/withdrawals", {
        method: "POST",
      }),
    ).rejects.toBeInstanceOf(ConnectionInterrupted);
    await connection.ready();
    expect(posts).toBe(1);
  }
});
it("preserves real validation/provider errors instead of treating them as a cold start", async () => {
  const send = vi.fn(async (input: RequestInfo | URL) =>
    String(input) === health
      ? Response.json({ status: "ok" })
      : Response.json({ error: { code: "UNAVAILABLE" } }, { status: 503 }),
  );
  const connection = createConnectionRecovery({
    healthUrl: health,
    fetcher: send,
  });
  expect(
    (
      await connection.fetch("https://api.example/api/v1/payments", {
        method: "POST",
      })
    ).status,
  ).toBe(503);
  expect(send).toHaveBeenCalledTimes(2);
});
it("shows a slow connection state and stops waiting after a bounded deadline", async () => {
  vi.useFakeTimers();
  const connection = createConnectionRecovery({
    healthUrl: health,
    fetcher: vi
      .fn()
      .mockResolvedValue(new Response("Starting", { status: 503 })),
    budgetMs: 17000,
    retryMs: 1000,
  });
  const result = expect(connection.ready()).rejects.toBeInstanceOf(
    ConnectionUnavailable,
  );
  await vi.advanceTimersByTimeAsync(15001);
  expect(connection.getSnapshot().phase).toBe("slow");
  await vi.advanceTimersByTimeAsync(2000);
  await result;
  expect(connection.getSnapshot().phase).toBe("unavailable");
});
it("does not send a cancelled submission once the shared probe becomes ready", async () => {
  vi.useFakeTimers();
  let awake = false;
  const send = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input) !== health)
      throw new Error("A cancelled submission was sent.");
    return awake
      ? Response.json({ status: "ok" })
      : new Response("Starting", { status: 503 });
  });
  const connection = createConnectionRecovery({
    healthUrl: health,
    fetcher: send,
    retryMs: 1000,
  });
  const controller = new AbortController();
  const outcome = expect(
    connection.fetch("https://api.example/api/v1/withdrawals", {
      method: "POST",
      signal: controller.signal,
    }),
  ).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(600);
  controller.abort();
  await outcome;
  awake = true;
  await vi.advanceTimersByTimeAsync(500);
  await connection.ready();
  expect(send.mock.calls.every(([url]) => String(url) === health)).toBe(true);
});
it("does not queue offline submissions for automatic replay", async () => {
  const send = vi.fn();
  const connection = createConnectionRecovery({
    healthUrl: health,
    fetcher: send,
    isOnline: () => false,
  });
  await expect(
    connection.fetch("https://api.example/api/v1/payments", { method: "POST" }),
  ).rejects.toBeInstanceOf(ConnectionOffline);
  expect(send).not.toHaveBeenCalled();
  expect(connection.getSnapshot().phase).toBe("offline");
});
