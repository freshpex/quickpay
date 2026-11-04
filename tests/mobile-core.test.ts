import { describe, expect, it, vi } from "vitest";
import {
  formatMoney,
  parseNaira,
  signUpSchema,
  type Transaction,
} from "@quickpay/contracts";
import {
  parseAppLink,
  linkRoute,
} from "../apps/mobile/src/services/deep-links/validate";
import { validateApiUrl } from "../apps/mobile/src/lib/config";
import {
  OperationCoordinator,
  type PendingOperation,
} from "../apps/mobile/src/features/transactions/services/operation";
import { SingleFlight } from "../apps/mobile/src/services/session/coordinator";
import { clearPrivateState } from "../apps/mobile/src/services/session/cleanup";
import {
  isPending,
  statusLabels,
} from "../apps/mobile/src/features/transactions/lib/status";
const id = "f672b74b-e01d-4a39-8f28-7a64b6ed30a2";
const transaction = { id, status: "processing" } as Transaction;
function coordinator() {
  let stored: PendingOperation | null = null;
  const io = {
    load: vi.fn(async () => stored),
    save: vi.fn(async (p: PendingOperation | null) => {
      stored = p;
    }),
    send: vi.fn(
      async (_operation: PendingOperation, _password?: string) => transaction,
    ),
    recover: vi.fn(async (): Promise<Transaction | null> => null),
    online: vi.fn(() => true),
    uuid: () => id,
  };
  return { io, operation: new OperationCoordinator(io), stored: () => stored };
}
describe("native financial recovery", () => {
  it("retains exact amount/key and never persists a password", async () => {
    const { operation, stored } = coordinator();
    await operation.submit(
      "owner",
      "payment",
      { amount: "900719925474099312", password: "never-store", pin: "1234" },
      "authorize",
    );
    expect(stored()?.body).toEqual({ amount: "900719925474099312" });
    expect(stored()?.key).toBe(id);
    expect(stored()?.transactionId).toBe(id);
  });
  it("blocks concurrent duplicate submission", async () => {
    const { operation, io } = coordinator();
    let done!: (t: Transaction) => void;
    io.send.mockImplementation(
      () =>
        new Promise((resolve) => {
          done = resolve;
        }),
    );
    const first = operation.submit("owner", "deposit", { amount: "10000" });
    await vi.waitFor(() => expect(io.send).toHaveBeenCalledTimes(1));
    await expect(
      operation.submit("owner", "deposit", { amount: "10000" }),
    ).rejects.toThrow("already");
    done(transaction);
    await first;
  });
  it("keeps unknown outcomes and reuses the original key after restart", async () => {
    const { operation, io, stored } = coordinator();
    io.send.mockRejectedValueOnce({ status: 0 });
    await expect(
      operation.submit("owner", "withdrawal", { amount: "10001" }, "secret"),
    ).rejects.toEqual({ status: 0 });
    const restored = new OperationCoordinator(io);
    await restored.retry("owner", "fresh authorization");
    expect(io.send.mock.calls[1][0].key).toBe(stored()?.key);
    expect(io.send.mock.calls[1][0].body.amount).toBe("10001");
  });
  it("checks authoritative status before any manual replay", async () => {
    const { operation, io } = coordinator();
    await operation.submit("owner", "deposit", { amount: "10000" });
    io.recover.mockResolvedValue(transaction);
    await operation.retry("owner");
    expect(io.send).toHaveBeenCalledTimes(1);
  });
  it("never sends offline or queues automatic replay", async () => {
    const { operation, io, stored } = coordinator();
    io.online.mockReturnValue(false);
    await expect(
      operation.submit("owner", "deposit", { amount: "10000" }),
    ).rejects.toThrow("offline");
    expect(io.send).not.toHaveBeenCalled();
    expect(stored()).toBeNull();
  });
  it("rejects account changes and releases definitive validation failures", async () => {
    const { operation, io, stored } = coordinator();
    await operation.submit("owner", "deposit", { amount: "10000" });
    await expect(operation.retry("someone-else")).rejects.toThrow("no longer");
    io.recover.mockResolvedValue(null);
    io.send.mockRejectedValueOnce({ status: 422 });
    await expect(operation.retry("owner")).rejects.toEqual({ status: 422 });
    expect(stored()).toBeNull();
  });
});
describe("native contracts and links", () => {
  it("cancels in-flight requests and clears private caches and secure data on logout", async () => {
    const order: string[] = [];
    await clearPrivateState(
      {
        cancelQueries: async () => {
          order.push("cancel");
        },
        clear: () => {
          order.push("cache");
        },
      },
      async () => {
        order.push("storage");
      },
    );
    expect(order).toEqual(["cancel", "cache", "storage"]);
  });
  it("formats exact values beyond Number precision", () => {
    expect(formatMoney("900719925474099312")).toBe("₦9,007,199,254,740,993.12");
    expect(parseNaira("9007199254740993.12")).toBe("900719925474099312");
    expect(formatMoney("-101")).toBe("-₦1.01");
  });
  it("keeps pending and reversed states distinct from success", () => {
    expect(isPending("awaiting_authorization")).toBe(true);
    expect(isPending("processing")).toBe(true);
    expect(isPending("reversed")).toBe(false);
    expect(statusLabels.reversed).toBe("Reversed");
  });
  it("validates shared confirm password and explicit policy consent", () => {
    const input = {
      name: "Native User",
      email: "person@example.com",
      phoneNumber: "08012345678",
      password: "StrongPassword123!",
      confirmPassword: "different",
      terms: false,
    };
    const invalid = signUpSchema.safeParse(input);
    expect(invalid.success).toBe(false);
    expect(
      signUpSchema.safeParse({
        ...input,
        terms: true,
        confirmPassword: input.password,
      }).success,
    ).toBe(true);
  });
  it("accepts only typed links on the configured host or development scheme", () => {
    expect(parseAppLink(`quickpay-dev://transaction?id=${id}`)).toEqual({
      kind: "transaction",
      id,
    });
    expect(
      linkRoute(
        parseAppLink(
          `https://quickpay.example/mobile/payment-return?id=${id}`,
          "quickpay.example",
        )!,
      ),
    ).toContain(id);
    for (const url of [
      `https://evil.example/mobile/transaction?id=${id}`,
      "quickpay-dev://transaction?id=../../admin",
      "javascript:alert(1)",
      "quickpay-dev://admin",
      "quickpay-dev://reset-password?token=short",
      "https://quickpay.example@evil.example/sign-in?verified=1",
    ])
      expect(parseAppLink(url, "quickpay.example")).toBeNull();
  });
  it("ignores untrusted success flags and redirect destinations", () => {
    expect(
      parseAppLink(
        `quickpay-dev://payment-return?id=${id}&status=successful&next=https://evil.example`,
      ),
    ).toEqual({ kind: "transaction", id });
    expect(
      parseAppLink("quickpay-dev://sign-up?ref=invite_12&next=/admin"),
    ).toEqual({ kind: "referral", code: "invite_12" });
  });
  it("requires HTTPS except explicit local development", () => {
    expect(validateApiUrl("http://10.0.2.2:3001/api/v1", true)).toContain(
      "10.0.2.2",
    );
    expect(() => validateApiUrl("http://10.0.2.2:3001/api/v1", false)).toThrow(
      "HTTPS",
    );
    expect(() => validateApiUrl("http://public.example/api/v1", true)).toThrow(
      "HTTPS",
    );
    expect(() =>
      validateApiUrl("https://user:secret@api.example/api/v1", false),
    ).toThrow();
  });
  it("coordinates concurrent session renewals", async () => {
    const flight = new SingleFlight<string>();
    const refresh = vi.fn(async () => "session");
    const result = await Promise.all([
      flight.run(refresh),
      flight.run(refresh),
      flight.run(refresh),
    ]);
    expect(result).toEqual(["session", "session", "session"]);
    expect(refresh).toHaveBeenCalledTimes(1);
    await flight.run(refresh);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
