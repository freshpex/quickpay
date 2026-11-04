"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Printer, RefreshCw, ExternalLink } from "lucide-react";
import { api, mutation } from "@quickpay/api-client";
import { formatMoney, type Transaction } from "@quickpay/contracts";
import { useApi } from "../../lib/use-api";
import { StatusBadge } from "../../components/ui/status-badge";
import { Button } from "../../components/ui/button";
import { LoadingState, ErrorState } from "../../components/feedback";
export function TransactionDetails({ id }: { id: string }) {
  const { data, error, loading, refresh } = useApi<{
    transaction: Transaction;
  }>(`/payments/${id}`);
  const [busy, setBusy] = useState(false);
  const t = data?.transaction;
  useEffect(() => {
    if (!t || !["processing", "awaiting_authorization"].includes(t.status))
      return;
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [t?.status, refresh]);
  async function check() {
    setBusy(true);
    try {
      const r = await api<{ message: string }>(
        `/payments/${id}/check`,
        mutation({}),
      );
      toast.success(r.message);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={refresh} />;
  if (!t) return null;
  const success = t.status === "successful";
  return (
    <section className="max-w-2xl">
      <Link
        href="/transactions"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-brand"
      >
        <ArrowLeft size={16} />
        All transactions
      </Link>
      <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">
            {success ? "Payment receipt" : "Payment details"}
          </h1>
          <StatusBadge status={t.status} />
        </div>
        <p className="my-8 text-4xl font-bold tracking-tight">
          {formatMoney(t.amount)}
        </p>
        <dl className="divide-y divide-ink/10 text-sm">
          {[
            ["Service", t.serviceId || t.kind],
            ["Reference", t.reference],
            [
              "Date",
              new Date(t.createdAt).toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
              }),
            ],
            ["Currency", t.currency],
            ["Fee", formatMoney(t.fee)],
            ["Total", formatMoney(BigInt(t.amount) + BigInt(t.fee))],
            ...(t.details.beneficiary
              ? [
                  [
                    "Recipient",
                    String(t.details.beneficiaryName || t.details.beneficiary),
                  ],
                ]
              : []),
            ...(t.details.accountName
              ? [
                  [
                    "Bank account",
                    `${t.details.accountName} · ${t.details.accountLast4}`,
                  ],
                ]
              : []),
          ].map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-3 py-4">
              <dt className="text-ink/50">{k}</dt>
              <dd className="max-w-full break-all font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {success && !!t.details.fulfillment && (
          <div className="my-5 rounded-xl bg-lime p-5">
            <h2 className="text-xs font-bold uppercase">
              Your token / fulfillment details
            </h2>
            <p className="mt-3 break-all font-mono text-xl font-bold">
              {String(t.details.fulfillment)}
            </p>
            <p className="mt-3 text-xs">
              Keep this private. Use it with the account shown above.
            </p>
          </div>
        )}
        {["processing", "awaiting_authorization"].includes(t.status) && (
          <p
            role="status"
            aria-live="polite"
            className="my-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
          >
            {t.status === "awaiting_authorization"
              ? "Complete your checkout to add money."
              : "We are checking your payment. Please check this transaction before trying again."}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {!!t.details.checkoutUrl && t.status === "awaiting_authorization" && (
            <a
              href={String(t.details.checkoutUrl)}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white"
            >
              Open secure checkout <ExternalLink size={17} />
            </a>
          )}
          {success ? (
            <Button onClick={() => window.print()}>
              <Printer size={17} />
              Print receipt
            </Button>
          ) : (
            <Button disabled={busy} onClick={check}>
              <RefreshCw size={17} />
              {busy ? "Checking…" : "Check your payment"}
            </Button>
          )}
          <Link
            href={`/support?transaction=${t.id}`}
            className="inline-flex min-h-12 items-center px-4 text-sm font-bold text-brand"
          >
            Get help with this payment
          </Link>
        </div>
      </div>
    </section>
  );
}
