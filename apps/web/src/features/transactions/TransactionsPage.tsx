"use client";
import { useState } from "react";
import { useApi } from "../../lib/use-api";
import { TransactionsTab } from "../wallet/tabs/transactions-tab/TransactionsTab";
import type { Transaction } from "@quickpay/contracts";
import { LoadingState, ErrorState } from "../../components/feedback";
export function TransactionsPage() {
  const [cursor, setCursor] = useState("");
  const history = useApi<{
    transactions: Transaction[];
    nextCursor: string | null;
  }>(`/payments${cursor ? `?before=${encodeURIComponent(cursor)}` : ""}`);
  const [filter, setFilter] = useState("all");
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Your transactions</h1>
      <p className="mt-3 text-sm text-ink/55">
        Check a payment, track its status, or open a receipt.
      </p>
      <div
        className="my-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter transactions"
      >
        {["all", "processing", "successful", "failed", "reversed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`min-h-11 rounded-full border px-4 text-xs font-bold capitalize ${filter === f ? "border-brand bg-brand text-white" : "border-ink/15 bg-white"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {history.loading ? (
        <LoadingState />
      ) : history.error ? (
        <ErrorState message={history.error} retry={history.refresh} />
      ) : (
        <TransactionsTab
          transactions={
            history.data?.transactions.filter(
              (t) => filter === "all" || t.status === filter,
            ) || []
          }
        />
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {cursor && (
          <button
            onClick={() => setCursor("")}
            className="min-h-11 rounded-xl border border-ink/15 px-5 text-sm font-bold"
          >
            Newest transactions
          </button>
        )}
        {history.data?.nextCursor && (
          <button
            onClick={() => setCursor(history.data!.nextCursor!)}
            className="min-h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white"
          >
            Older transactions
          </button>
        )}
      </div>
    </section>
  );
}
