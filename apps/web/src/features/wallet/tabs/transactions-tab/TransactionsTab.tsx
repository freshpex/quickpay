"use client";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { formatMoney, type Transaction } from "@quickpay/contracts";
import { StatusBadge } from "../../../../components/ui/status-badge";
import { EmptyState } from "../../../../components/feedback";
export function TransactionsTab({
  transactions,
}: {
  transactions: Transaction[];
}) {
  if (!transactions.length)
    return (
      <EmptyState
        title="Your first payment starts here."
        description="Once you make a payment, you can track it and open its receipt here."
      />
    );
  return (
    <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
      {transactions.map((t) => (
        <Link
          key={t.id}
          href={`/transactions/detail?id=${encodeURIComponent(t.id)}`}
          className="flex min-h-24 flex-wrap items-center justify-between gap-4 p-4 transition hover:bg-paper md:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${t.kind === "deposit" ? "bg-green-50 text-green-700" : "bg-brand/5 text-brand"}`}
            >
              {t.kind === "deposit" ? (
                <ArrowDownLeft size={20} />
              ) : t.kind === "withdrawal" ? (
                <ArrowUpRight size={20} />
              ) : (
                <Receipt size={20} />
              )}
            </span>
            <div>
              <p className="text-sm font-bold capitalize">
                {t.serviceId?.replaceAll("-", " ") ||
                  t.kind.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-[11px] text-ink/45">
                {new Date(t.createdAt).toLocaleString("en-NG", {
                  timeZone: "Africa/Lagos",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            <span className="text-sm font-bold">{formatMoney(t.amount)}</span>
            <StatusBadge status={t.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
