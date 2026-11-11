"use client";
import { BuyCards } from "./BuyCards";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, mutation } from "@quickpay/api-client";
import { formatMoney } from "@quickpay/contracts";
import { useApi } from "../../lib/use-api";
import { Field } from "../../components/ui/form-field";
import { inputClass } from "../../components/ui/password-input";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/ui/status-badge";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BadgeCheck,
  Clock3,
  Gift,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "../../components/feedback";
type Product = {
  id: string;
  brand: string;
  region: string;
  card_type: string;
  min_units: string;
  max_units: string;
};
type Quote = {
  id: string;
  amount: string;
  expiresAt: string;
  brand: string;
  region: string;
  cardType: string;
};
export function GiftCardsPage() {
  const products = useApi<{
      products: Product[];
      buyingAvailable: boolean;
      sandbox: boolean;
    }>("/gift-cards/products"),
    sales = useApi<{
      sales: {
        id: string;
        status: string;
        brand: string;
        region: string;
        card_type: string;
        amount: string;
        reason: string | null;
        created_at: string;
      }[];
    }>("/gift-cards/sales");
  const [tab, setTab] = useState("sell"),
    [product, setProduct] = useState(""),
    [units, setUnits] = useState(""),
    [quote, setQuote] = useState<Quote>(),
    [evidence, setEvidence] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const selectedProduct = products.data?.products.find((p) => p.id === product);
  async function getQuote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setQuote(
        await api(
          "/gift-cards/quotes",
          mutation({ productId: product, units }),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const v = await api<{ id: string }>("/gift-cards/evidence", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      setEvidence(v.id);
      toast.success("Evidence received. It will be checked before review.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function sell() {
    setBusy(true);
    try {
      await api(
        "/gift-cards/sales",
        mutation({ quoteId: quote?.id, evidenceId: evidence }),
      );
      toast.success("Your gift card has been submitted for review.");
      setQuote(undefined);
      setEvidence("");
      await sales.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-6xl space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-deep via-brand to-[#168b77] px-6 py-8 text-white shadow-xl shadow-brand/10 sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-12 -top-20 size-72 rounded-full border-[36px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-32 size-64 rounded-full bg-lime/10 blur-2xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85">
              <Sparkles size={14} /> Gift card marketplace
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Your gift cards, put to work.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              See the value up front, follow every step, and keep your sales and
              purchases together in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[390px]">
            {[
              ["01", "Choose a card"],
              ["02", "Review the quote"],
              ["03", "Track the result"],
            ].map(([step, label]) => (
              <div
                key={step}
                className="rounded-2xl border border-white/10 bg-white/10 p-3 sm:p-4"
              >
                <span className="text-xs font-bold text-lime">{step}</span>
                <p className="mt-2 text-xs font-semibold leading-4 text-white/85 sm:text-sm">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ink">
            What would you like to do?
          </p>
          <p className="mt-1 text-sm text-ink/55">
            Choose a flow to see its rates and requirements.
          </p>
        </div>
        <div
          className="inline-flex w-full rounded-2xl border border-ink/10 bg-white p-1.5 shadow-sm sm:w-auto"
          role="group"
          aria-label="Gift-card action"
        >
          {(["sell", "buy", "history"] as const).map((t) => {
            const Icon =
              t === "sell"
                ? ArrowUpFromLine
                : t === "buy"
                  ? ArrowDownToLine
                  : Clock3;
            return (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
                aria-pressed={tab === t}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold capitalize transition sm:flex-none ${tab === t ? "bg-brand text-white shadow-sm" : "text-ink/55 hover:bg-paper hover:text-ink"}`}
              >
                <Icon size={16} />
                {t === "history" ? "Activity" : `${t} cards`}
              </button>
            );
          })}
        </div>
      </div>

      {error && <ErrorState message={error} />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {tab === "buy" ? (
            products.loading ? (
              <LoadingState />
            ) : products.error ? (
              <ErrorState message={products.error} />
            ) : products.data?.buyingAvailable ? (
              <BuyCards />
            ) : (
              <div className="rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-sm">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/8 text-brand">
                  <Gift />
                </span>
                <h2 className="mt-4 text-lg font-bold">
                  Buying is being prepared
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/55">
                  Gift card purchases will appear here when this service is
                  available.
                </p>
              </div>
            )
          ) : tab === "history" ? (
            sales.loading ? (
              <LoadingState />
            ) : sales.error ? (
              <ErrorState message={sales.error} />
            ) : sales.data?.sales.length ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 pb-1">
                  <div>
                    <h2 className="text-lg font-bold">Your sales</h2>
                    <p className="mt-1 text-sm text-ink/50">
                      Follow each card from review to settlement.
                    </p>
                  </div>
                  <span className="rounded-full bg-brand/8 px-3 py-1.5 text-xs font-bold text-brand">
                    {sales.data.sales.length} records
                  </span>
                </div>
                {sales.data.sales.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-brand/8 text-brand">
                          <Gift size={19} />
                        </span>
                        <div>
                          <h3 className="font-bold">{s.brand}</h3>
                          <p className="mt-0.5 text-xs text-ink/50">
                            {s.region} · {s.card_type}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-ink/8 pt-4">
                      <div>
                        <p className="text-xs text-ink/50">Quoted payout</p>
                        <p className="mt-1 text-lg font-bold">
                          {formatMoney(s.amount)}
                        </p>
                      </div>
                      <p className="text-xs text-ink/45">
                        {new Date(s.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "Africa/Lagos",
                        })}
                      </p>
                    </div>
                    {s.reason && (
                      <p className="mt-3 text-sm text-ink/60">{s.reason}</p>
                    )}
                    <Link
                      href="/support"
                      className="mt-3 inline-block text-xs font-bold text-brand"
                    >
                      Ask about this sale
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-ink/15 bg-white p-10 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/8 text-brand">
                  <Clock3 />
                </span>
                <h2 className="mt-4 font-bold">Your activity will show here</h2>
                <p className="mt-2 text-sm text-ink/55">
                  Once you submit a card for review, you can follow its status
                  from this page.
                </p>
              </div>
            )
          ) : products.loading ? (
            <LoadingState />
          ) : products.error ? (
            <ErrorState message={products.error} />
          ) : !products.data?.products.length ? (
            <EmptyState
              title="No gift cards available to sell right now."
              description="Check back for supported brands, regions and card types."
            />
          ) : quote ? (
            <div className="space-y-5 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-lime/35 px-3 py-1.5 text-xs font-bold text-deep">
                <BadgeCheck size={14} /> Quote ready
              </span>
              <h2 className="text-xl font-bold">Review your quote</h2>
              <p>
                {quote.brand} · {quote.region} · {quote.cardType}
              </p>
              <p className="text-4xl font-bold tracking-tight text-brand">
                {formatMoney(quote.amount)}
              </p>
              <p className="flex items-start gap-2 rounded-xl bg-paper p-3 text-xs leading-5 text-ink/55">
                <Clock3 size={15} className="mt-0.5 shrink-0 text-brand" />
                Expires{" "}
                {new Date(quote.expiresAt).toLocaleString("en-NG", {
                  timeZone: "Africa/Lagos",
                })}
                . Subject to verification of card value.
              </p>
              <label className="block text-sm font-bold" htmlFor="evidence">
                Upload card evidence (JPG or PNG, max 5 MB)
              </label>
              <input
                type="file"
                id="evidence"
                accept="image/jpeg,image/png"
                onChange={(e) => {
                  if (e.target.files?.[0]) void upload(e.target.files[0]);
                }}
                className={inputClass}
              />
              <p className="text-xs leading-relaxed text-ink/55">
                Your evidence is private and held for a safety check. Uploading
                a file does not add money to your wallet. Rejected cards receive
                a reason and a support path.
              </p>
              <Button onClick={sell} disabled={!evidence || busy}>
                Submit for review
              </Button>
              <button
                onClick={() => {
                  setQuote(undefined);
                  setEvidence("");
                  setError("");
                }}
                className="ml-4 min-h-11 text-sm font-bold text-brand"
              >
                New quote
              </button>
            </div>
          ) : (
            <form
              onSubmit={getQuote}
              className="space-y-5 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8"
            >
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand/8 px-3 py-1.5 text-xs font-bold text-brand">
                  <ArrowUpFromLine size={14} /> Sell a gift card
                </span>
                <h2 className="mt-4 text-xl font-bold">Get your naira quote</h2>
                <p className="mt-1 text-sm text-ink/55">
                  Select the card and face value to see the estimated payout.
                </p>
              </div>
              <div>
                <label
                  htmlFor="product"
                  className="mb-2 block text-sm font-bold"
                >
                  Brand, region and type
                </label>
                <select
                  id="product"
                  required
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose a supported card</option>
                  {products.data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} · {p.region} · {p.card_type} · {p.min_units}–
                      {p.max_units}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Card face value (whole units)"
                id="units"
                required
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                inputMode="numeric"
                pattern="[1-9][0-9]*"
              />
              {selectedProduct && (
                <p className="-mt-3 flex items-center gap-2 text-xs text-ink/50">
                  <ShieldCheck size={14} className="text-brand" /> Accepted
                  range: {selectedProduct.min_units}–{selectedProduct.max_units}{" "}
                  whole units.
                </p>
              )}
              <Button disabled={busy}>Get a naira quote</Button>
            </form>
          )}
        </div>
        <aside className="h-fit rounded-3xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-lime/35 text-deep">
            <ShieldCheck size={20} />
          </span>
          <h2 className="mt-4 font-bold">A clear, careful process</h2>
          <ul className="mt-4 space-y-4 text-sm text-ink/60">
            {[
              [
                "Rates before you submit",
                "Review the naira quote and expiry first.",
              ],
              [
                "Private card evidence",
                "Uploads are held securely for review.",
              ],
              [
                "Status you can follow",
                "See updates and the next step in Activity.",
              ],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
                <span>
                  <strong className="block text-ink">{title}</strong>
                  <span className="mt-1 block leading-5">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/support"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand"
          >
            Questions? Contact support <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </section>
  );
}
