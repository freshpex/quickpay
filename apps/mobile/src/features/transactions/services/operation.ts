import type { Transaction } from "@quickpay/contracts";
export type PendingOperation = {
  key: string;
  kind: "deposit" | "withdrawal" | "payment";
  body: Record<string, unknown>;
  transactionId?: string;
  createdAt: string;
  userId: string;
};
type IO = {
  load: () => Promise<PendingOperation | null>;
  save: (operation: PendingOperation | null) => Promise<void>;
  send: (operation: PendingOperation, pin?: string) => Promise<Transaction>;
  recover: (key: string) => Promise<Transaction | null>;
  online: () => boolean;
  uuid: () => string;
};
export class OperationCoordinator {
  private busy = false;
  constructor(private io: IO) {}
  async submit(
    userId: string,
    kind: PendingOperation["kind"],
    body: Record<string, unknown>,
    pin?: string,
  ) {
    if (this.busy) throw new Error("Your payment is already being submitted.");
    if (!this.io.online())
      throw new Error(
        "You are offline. Reconnect before submitting a payment.",
      );
    this.busy = true;
    try {
      const old = await this.io.load();
      if (old)
        throw new Error(
          "Resolve your previous payment in Activity before starting another.",
        );
      // Authorization secrets never enter storage; exact request and key survive interruption.
      const clean = Object.fromEntries(
        Object.entries(body).filter(
          ([key]) => !["password", "token", "pin"].includes(key),
        ),
      );
      const pending: PendingOperation = {
        key: this.io.uuid(),
        userId,
        kind,
        body: clean,
        createdAt: new Date().toISOString(),
      };
      await this.io.save(pending);
      return await this.send(pending, pin);
    } finally {
      this.busy = false;
    }
  }
  async retry(userId: string, pin?: string) {
    if (this.busy) throw new Error("Your payment is already being checked.");
    if (!this.io.online()) throw new Error("Reconnect to check this payment.");
    this.busy = true;
    try {
      const pending = await this.io.load();
      if (!pending || pending.userId !== userId)
        throw new Error("This payment is no longer available on this device.");
      const existing = await this.io.recover(pending.key);
      if (existing) {
        await this.io.save({ ...pending, transactionId: existing.id });
        return existing;
      }
      return await this.send(pending, pin);
    } finally {
      this.busy = false;
    }
  }
  private async send(pending: PendingOperation, pin?: string) {
    try {
      const t = await this.io.send(pending, pin);
      await this.io.save({ ...pending, transactionId: t.id });
      return t;
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (
        status &&
        status >= 400 &&
        status < 500 &&
        status !== 408 &&
        status !== 429
      )
        await this.io.save(null);
      throw e;
    }
  }
}
