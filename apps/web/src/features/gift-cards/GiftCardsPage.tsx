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
    <section className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gift cards</h1>
        <p className="mt-3 text-sm text-ink/55">
          Clear quotes. Careful checks. Naira settlement after review.
        </p>
      </div>
      <div className="flex gap-2" role="group" aria-label="Gift-card action">
        {["sell", "buy", "history"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError("");
            }}
            aria-pressed={tab === t}
            className={`min-h-11 rounded-full px-5 text-sm font-bold capitalize ${tab === t ? "bg-brand text-white" : "border border-ink/15 bg-white"}`}
          >
            {t === "history" ? "My sales" : `${t} cards`}
          </button>
        ))}
      </div>
      {products.data?.sandbox && (
        <p className="rounded-xl bg-violet-50 p-4 text-sm">
          Sandbox mode. Cards marked Sandbox use illustrative rates. Upload
          sample evidence only. Sales require administrator review before
          settlement.
        </p>
      )}
      {error && <ErrorState message={error} />}
      <div className="max-w-2xl">
        {tab === "buy" ? (
          products.loading ? (
            <LoadingState />
          ) : products.error ? (
            <ErrorState message={products.error} />
          ) : products.data?.buyingAvailable ? (
            <BuyCards />
          ) : (
            <EmptyState title="Gift-card buying is currently unavailable." />
          )
        ) : tab === "history" ? (
          sales.loading ? (
            <LoadingState />
          ) : sales.error ? (
            <ErrorState message={sales.error} />
          ) : sales.data?.sales.length ? (
            <div className="space-y-3">
              {sales.data.sales.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-ink/10 bg-white p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <h2 className="font-bold">
                      {s.brand} · {formatMoney(s.amount)}
                    </h2>
                    <StatusBadge status={s.status} />
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
            <EmptyState title="No gift-card sales yet." />
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
          <div className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6">
            <h2 className="text-xl font-bold">Review your quote</h2>
            <p>
              {quote.brand} · {quote.region} · {quote.cardType}
            </p>
            <p className="text-3xl font-bold text-brand">
              {formatMoney(quote.amount)}
            </p>
            <p className="text-xs text-ink/55">
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
              Your evidence is private and held for a safety check. Uploading a
              file does not add money to your wallet. Rejected cards receive a
              reason and a support path.
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
            className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6"
          >
            <div>
              <label htmlFor="product" className="mb-2 block text-sm font-bold">
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
                    {p.brand} · {p.region} · {p.card_type}
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
            <Button disabled={busy}>Get a naira quote</Button>
          </form>
        )}
      </div>
    </section>
  );
}
