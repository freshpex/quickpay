"use client";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { useApi } from "../../lib/use-api";
import { LoadingState, ErrorState } from "../../components/feedback";
export function ExchangesPage() {
  const r = useApi<{ message: string }>("/exchanges");
  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Supported exchanges</h1>
      <div className="mt-8 rounded-3xl border border-ink/10 bg-white p-8">
        <ArrowLeftRight className="text-brand" size={32} />
        <h2 className="mt-6 text-xl font-bold">
          Clear value. Confirmed support.
        </h2>
        {r.loading ? (
          <LoadingState />
        ) : r.error ? (
          <ErrorState message={r.error} />
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-ink/60">
            {r.data?.message}
          </p>
        )}
        <Link
          href="/gift-cards"
          className="mt-6 inline-flex min-h-12 items-center font-bold text-brand"
        >
          Explore gift-card sales
        </Link>
      </div>
    </section>
  );
}
