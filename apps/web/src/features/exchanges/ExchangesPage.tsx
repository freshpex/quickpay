"use client";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowLeftRight,
  ArrowRight,
  BadgeInfo,
  CircleDollarSign,
  CreditCard,
  Globe2,
  Sparkles,
} from "lucide-react";
import { useApi } from "../../lib/use-api";
import { LoadingState, ErrorState } from "../../components/feedback";
export function ExchangesPage() {
  const r = useApi<{
    message: string;
    pairs?: { id: string; source: string; target: string; enabled?: boolean }[];
  }>("/exchanges");
  return (
    <section className="mx-auto max-w-6xl space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#173c46] via-deep to-brand px-6 py-9 text-white shadow-xl shadow-deep/10 sm:px-10 sm:py-11">
        <div className="pointer-events-none absolute -right-12 -top-28 size-80 rounded-full border-[42px] border-white/5" />
        <div className="pointer-events-none absolute bottom-0 right-52 size-48 rounded-full bg-lime/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
              <Globe2 size={14} /> Exchange desk
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Move value with clarity.
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base">
              Review supported markets, understand your quote, and keep each
              exchange easy to track.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/8 p-5 sm:p-6">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10">
              <CircleDollarSign size={26} className="text-lime" />
            </span>
            <ArrowDownUp size={20} className="text-white/45" />
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10">
              <CreditCard size={26} className="text-white" />
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Available markets</h2>
              <p className="mt-1 text-sm text-ink/55">
                Configured pairs are shown with current availability state.
              </p>
            </div>
            {r.data?.pairs?.length ? (
              <span className="rounded-full bg-brand/8 px-3 py-1.5 text-xs font-bold text-brand">
                {r.data.pairs.length} markets
              </span>
            ) : null}
          </div>
          {r.loading ? (
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
              <LoadingState />
            </div>
          ) : r.error ? (
            <ErrorState message={r.error} />
          ) : r.data?.pairs?.some((pair) => pair.enabled !== false) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {r.data.pairs
                .filter((pair) => pair.enabled !== false)
                .map((pair) => (
                  <article
                    key={pair.id}
                    className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-brand/8 text-brand">
                        <ArrowLeftRight size={19} />
                      </span>
                      <span className="rounded-full bg-lime/35 px-2.5 py-1 text-[11px] font-bold text-deep">
                        Enabled pair
                      </span>
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                      Exchange pair
                    </p>
                    <h3 className="mt-2 text-xl font-bold">
                      {pair.source} <span className="px-1 text-brand">→</span>{" "}
                      {pair.target}
                    </h3>
                    <p className="mt-2 text-sm text-ink/55">
                      This pair is configured. Quotes and conversions are not
                      available in this release yet.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand/10 px-4 text-sm font-bold text-brand disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Quote unavailable <Sparkles size={15} />
                    </button>
                  </article>
                ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <BadgeInfo size={24} />
                </span>
                <div>
                  <h3 className="text-lg font-bold">
                    No currency pairs are open yet
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-ink/55">
                    {r.data?.message ??
                      "We will show supported currencies and current exchange details here when markets are available."}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-ink/45">
                    No rate or settlement is shown until a supported provider
                    and market are available.
                  </p>
                </div>
              </div>
              <div className="mt-7 grid gap-3 border-t border-ink/8 pt-5 sm:grid-cols-3">
                {[
                  ["Clear quote", "See the rate and fees first."],
                  ["Your review", "Check details before confirming."],
                  ["Track progress", "Keep the exchange status close."],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl bg-paper p-4">
                    <p className="text-sm font-bold">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-ink/50">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-3xl border border-brand/10 bg-brand/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-bold">Have a gift card to exchange?</p>
              <p className="mt-1 text-sm text-ink/55">
                Get a naira quote and follow the review from your Gift cards
                page.
              </p>
            </div>
            <Link
              href="/gift-cards"
              className="mt-4 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-deep sm:mt-0"
            >
              Open gift cards <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <aside className="h-fit rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            How it works
          </p>
          <h2 className="mt-2 text-lg font-bold">
            Know the details before you move value.
          </h2>
          <ol className="mt-5 space-y-5">
            {[
              [
                "01",
                "Choose a market",
                "Select a supported pair when it is available.",
              ],
              [
                "02",
                "Review your quote",
                "Check the rate, amount and any fee.",
              ],
              [
                "03",
                "Follow the exchange",
                "See its latest status from your account.",
              ],
            ].map(([step, title, text]) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-paper text-xs font-bold text-brand">
                  {step}
                </span>
                <span>
                  <strong className="text-sm">{title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-ink/50">
                    {text}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
