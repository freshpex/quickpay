"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Plus, ArrowUpRight, Wallet } from "lucide-react";
import { formatMoney } from "@quickpay/contracts";
export type WalletData = {
  available: string;
  reserved: string;
  rewards: string;
  reward_debt: string;
  currency: string;
};
export function BalanceCard({ wallet }: { wallet: WalletData }) {
  const [show, setShow] = useState(true);
  return (
    <section className="relative overflow-hidden rounded-3xl bg-brand p-6 text-white md:p-8">
      <div
        aria-hidden
        className="absolute -right-14 -top-20 size-80 rounded-full border-[50px] border-white/5"
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <Wallet size={17} />
          <h2 className="text-sm text-white/70">Available balance</h2>
          <button
            aria-label={show ? "Hide balance" : "Show balance"}
            aria-pressed={show}
            onClick={() => setShow(!show)}
            className="flex size-10 items-center justify-center rounded-full hover:bg-white/10"
          >
            {show ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
        </div>
        <p className="mt-2 break-all text-4xl font-bold tracking-tight md:text-5xl">
          {show ? formatMoney(wallet.available) : "••••••"}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/deposit"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-lime px-5 text-sm font-bold text-deep"
          >
            <Plus size={17} />
            Add money
          </Link>
          <Link
            href="/withdraw"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-bold"
          >
            <ArrowUpRight size={17} />
            Withdraw
          </Link>
        </div>
        <div className="mt-7 flex flex-wrap gap-6 border-t border-white/20 pt-4 text-xs text-white/65">
          <p>
            Reserved{" "}
            <span className="ml-2 font-bold text-white">
              {show ? formatMoney(wallet.reserved) : "•••"}
            </span>
          </p>
          <p>
            Rewards{" "}
            <span className="ml-2 font-bold text-lime">
              {show ? formatMoney(wallet.rewards) : "•••"}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
