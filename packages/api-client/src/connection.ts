export type ConnectionPhase =
  | "idle"
  | "connecting"
  | "slow"
  | "ready"
  | "unavailable"
  | "offline";
export type ConnectionSnapshot = { phase: ConnectionPhase };
export class ConnectionUnavailable extends Error {
  constructor() {
    super(
      "Connecting is taking longer than usual. Please try again. Your information is still here.",
    );
  }
}
export class ConnectionOffline extends Error {
  constructor() {
    super("You’re offline. Reconnect, then try again.");
  }
}
export class ConnectionInterrupted extends Error {
  constructor() {
    super(
      "Your connection was interrupted. We couldn’t confirm the result. Check its latest status before trying again.",
    );
  }
}
const cancelled = () => {
  const error = new Error("Request cancelled.");
  error.name = "AbortError";
  return error;
};
function waitFor<T>(task: Promise<T>, signal?: AbortSignal | null): Promise<T> {
  if (!signal) return task;
  if (signal.aborted) return Promise.reject(cancelled());
  return new Promise((resolve, reject) => {
    const abort = () => reject(cancelled());
    signal.addEventListener("abort", abort, { once: true });
    task
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

/** A single bounded readiness check shared by all pages and auth requests.
 * Only GET/HEAD requests may be replayed. Submitted mutations are never replayed.
 */
export function createConnectionRecovery(options: {
  healthUrl: string;
  fetcher?: typeof fetch;
  budgetMs?: number;
  probeMs?: number;
  retryMs?: number;
  freshMs?: number;
  isOnline?: () => boolean | Promise<boolean>;
}) {
  let snapshot: ConnectionSnapshot = { phase: "idle" };
  let availableAt = 0;
  let flight: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const raw: typeof fetch = (...args) => (options.fetcher || fetch)(...args);
  const budget = options.budgetMs ?? 120000;
  const emit = (phase: ConnectionPhase) => {
    if (snapshot.phase === phase) return;
    snapshot = { phase };
    for (const listener of listeners) listener();
  };
  const invalidate = () => {
    availableAt = 0;
  };
  async function online() {
    if (options.isOnline && !(await options.isOnline())) {
      invalidate();
      emit("offline");
      throw new ConnectionOffline();
    }
  }
  async function probe() {
    const started = Date.now();
    // Avoid flashing a banner on a healthy, fast connection.
    const notice = setTimeout(() => emit("connecting"), 500);
    const slow = setTimeout(() => emit("slow"), 15000);
    try {
      while (Date.now() - started < budget) {
        await online();
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          Math.min(options.probeMs ?? 12000, budget - (Date.now() - started)),
        );
        try {
          const response = await raw(options.healthUrl, {
            method: "GET",
            cache: "no-store",
            credentials: "omit",
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          const value = await response.json().catch(() => null);
          if (response.ok && value?.status === "ok") {
            availableAt = Date.now();
            emit("ready");
            return;
          }
        } catch {
          /* Cold starts and temporary transport failures share readiness recovery. */
        } finally {
          clearTimeout(timer);
        }
        const remaining = budget - (Date.now() - started);
        if (remaining > 0)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(options.retryMs ?? 3000, remaining)),
          );
      }
      emit("unavailable");
      throw new ConnectionUnavailable();
    } finally {
      clearTimeout(notice);
      clearTimeout(slow);
    }
  }
  function ready(signal?: AbortSignal | null) {
    if (signal?.aborted) return Promise.reject(cancelled());
    if (availableAt && Date.now() - availableAt < (options.freshMs ?? 60000))
      return Promise.resolve();
    if (!flight)
      flight = probe().finally(() => {
        flight = undefined;
      });
    return waitFor(flight, signal);
  }
  const recoveringFetch: typeof fetch = async (input, init) => {
    const request =
      typeof input === "object" && "method" in input
        ? (input as Request)
        : undefined;
    const signal = init?.signal ?? request?.signal;
    const method = (init?.method || request?.method || "GET").toUpperCase();
    const safe = method === "GET" || method === "HEAD";
    await ready(signal);
    await online();
    if (signal?.aborted) throw cancelled();
    let response: Response;
    try {
      response = await raw(input, init);
    } catch (error) {
      if (signal?.aborted) throw error;
      invalidate();
      if (!safe) {
        void ready().catch(() => {});
        throw new ConnectionInterrupted();
      }
      await ready(signal);
      return raw(input, init);
    }
    const gateway =
      [502, 503, 504].includes(response.status) &&
      !response.headers.get("Content-Type")?.includes("application/json");
    const wakePage =
      response.ok &&
      response.headers.get("Content-Type")?.includes("text/html");
    if (gateway || wakePage) {
      invalidate();
      if (safe) {
        await ready(signal);
        return raw(input, init);
      }
      // The server may have received a POST: leave status recovery to its owner.
      void ready().catch(() => {});
      throw new ConnectionInterrupted();
    } else if (response.ok) availableAt = Date.now();
    return response;
  };
  return {
    fetch: recoveringFetch,
    ready,
    invalidate,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
export const webConnection = createConnectionRecovery({
  healthUrl: "/api/v1/health",
  isOnline: () =>
    typeof navigator === "undefined" || navigator.onLine !== false,
});
