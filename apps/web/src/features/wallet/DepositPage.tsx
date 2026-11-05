"use client";
import { TransactionPinField } from "../security/TransactionPinField";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, mutation } from "@quickpay/api-client";
import { parseNaira, type Transaction } from "@quickpay/contracts";
import { Field } from "../../components/ui/form-field";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/feedback";
export function DepositPage() {
  const [busy, setBusy] = useState(false),
    [pinReady, setPinReady] = useState(false),
    [error, setError] = useState(""),
    [key] = useState(() => crypto.randomUUID());
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const amount = parseNaira(
        String(new FormData(e.currentTarget).get("amount")),
      );
      const r = await api<{ transaction: Transaction }>(
        "/deposits",
        mutation(
          { amount, pin: new FormData(e.currentTarget).get("pin") },
          key,
        ),
      );
      router.push(
        `/transactions/detail?id=${encodeURIComponent(r.transaction.id)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">Add money</h1>
      <p className="mb-8 mt-3 text-sm leading-relaxed text-ink/60">
        Choose an amount. We’ll prepare a secure hosted checkout. Your wallet is
        credited after the payment is verified.
      </p>
      <form
        onSubmit={submit}
        className="space-y-6 rounded-2xl border border-ink/10 bg-white p-6"
      >
        <Field
          label="Amount (₦)"
          id="amount"
          name="amount"
          inputMode="decimal"
          type="text"
          pattern="[0-9]+(\.[0-9]{1,2})?"
          required
          placeholder="5,000"
        />
        <p className="text-xs text-ink/50">Minimum ₦100. Maximum ₦1,000,000.</p>
        <TransactionPinField onReady={setPinReady} />
        {error && <ErrorState message={error} />}
        <Button disabled={busy || !pinReady} className="w-full">
          {busy ? "Preparing checkout…" : "Continue to checkout"}
        </Button>
      </form>
    </section>
  );
}
