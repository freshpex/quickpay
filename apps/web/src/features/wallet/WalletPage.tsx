"use client";
import { useApi } from "../../lib/use-api";
import {
  BalanceCard,
  type WalletData,
} from "./components/balance-card/BalanceCard";
import { TransactionsTab } from "./tabs/transactions-tab/TransactionsTab";
import { LoadingState, ErrorState } from "../../components/feedback";
import type { Transaction } from "@quickpay/contracts";
export function WalletPage() {
  const wallet = useApi<WalletData>("/wallet"),
    history = useApi<{ transactions: Transaction[] }>("/payments");
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your wallet</h1>
        <p className="mt-2 text-sm text-ink/55">
          Add money, make a payment, or withdraw to your bank.
        </p>
      </div>
      {wallet.loading ? (
        <LoadingState />
      ) : wallet.error ? (
        <ErrorState message={wallet.error} retry={wallet.refresh} />
      ) : (
        wallet.data && <BalanceCard wallet={wallet.data} />
      )}
      <section>
        <h2 className="mb-4 text-lg font-bold">Wallet activity</h2>
        {history.loading ? (
          <LoadingState />
        ) : history.error ? (
          <ErrorState message={history.error} />
        ) : (
          <TransactionsTab transactions={history.data?.transactions || []} />
        )}
      </section>
    </div>
  );
}
