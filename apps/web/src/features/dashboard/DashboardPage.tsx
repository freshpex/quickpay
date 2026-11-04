"use client";
import Link from "next/link";
import {
  Phone,
  Wifi,
  Lightbulb,
  Tv,
  Gift,
  ArrowUpRight,
  Users,
} from "lucide-react";
import { useApi } from "../../lib/use-api";
import {
  BalanceCard,
  type WalletData,
} from "../wallet/components/balance-card/BalanceCard";
import { TransactionsTab } from "../wallet/tabs/transactions-tab/TransactionsTab";
import { LoadingState, ErrorState } from "../../components/feedback";
import type { Transaction } from "@quickpay/contracts";
export function DashboardPage() {
  const profile = useApi<{ user: { name: string; email_verified: boolean } }>(
      "/profile",
    ),
    wallet = useApi<WalletData>("/wallet"),
    history = useApi<{ transactions: Transaction[] }>("/payments");
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs font-semibold text-brand">
          YOUR EVERYDAY, TOGETHER.
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Hello{profile.data ? `, ${profile.data.user.name.split(" ")[0]}` : ""}
          .
        </h1>
        <p className="mt-2 text-sm text-ink/55">
          A little less to do. A little more day for you.
        </p>
      </div>
      {profile.data && !profile.data.user.email_verified && (
        <div
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          Verify your email to start making payments.{" "}
          <Link href="/settings" className="font-bold underline">
            Open account settings
          </Link>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div>
          {wallet.loading ? (
            <LoadingState />
          ) : wallet.error ? (
            <ErrorState message={wallet.error} retry={wallet.refresh} />
          ) : (
            wallet.data && <BalanceCard wallet={wallet.data} />
          )}
        </div>
        <section className="flex flex-col justify-between rounded-3xl bg-lime p-7">
          <Users size={32} />
          <div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight">
              Good things
              <br />
              are better shared.
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-ink/60">
              Invite a friend and check the latest reward campaign.
            </p>
            <Link
              href="/referrals"
              className="mt-5 inline-flex min-h-11 items-center gap-6 text-sm font-bold"
            >
              Refer & earn <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </div>
      <section>
        <h2 className="mb-4 text-lg font-bold">What are we sorting today?</h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {[
            ["Airtime", Phone, "/airtime"],
            ["Data", Wifi, "/data"],
            ["Electricity", Lightbulb, "/bills?category=electricity"],
            ["TV", Tv, "/bills?category=television"],
            ["Internet", Wifi, "/bills?category=internet"],
            ["Gift cards", Gift, "/gift-cards"],
          ].map(([name, Icon, href]) => {
            const I = Icon as typeof Phone;
            return (
              <Link
                key={String(name)}
                href={String(href)}
                className="group rounded-2xl border border-ink/10 bg-white px-3 py-5 text-center transition hover:-translate-y-1 hover:border-brand/30"
              >
                <I size={23} className="mx-auto mb-3 text-brand" />
                <span className="text-xs font-semibold">{String(name)}</span>
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink/45">
          Each service shows its current availability before you pay.
        </p>
      </section>
      <section>
        <div className="mb-4 flex justify-between">
          <h2 className="text-lg font-bold">Recent activity</h2>
          <Link href="/transactions" className="text-sm font-bold text-brand">
            View all
          </Link>
        </div>
        {history.loading ? (
          <LoadingState />
        ) : history.error ? (
          <ErrorState message={history.error} />
        ) : (
          <TransactionsTab
            transactions={history.data?.transactions.slice(0, 5) || []}
          />
        )}
      </section>
    </div>
  );
}
