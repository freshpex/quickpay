"use client";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Gift,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api, mutation } from "@quickpay/api-client";
import {
  formatMoney,
  type GiftPurchase,
  type GiftPurchaseResult,
} from "@quickpay/contracts";
import { useApi } from "../../lib/use-api";
import { Button } from "../../components/ui/button";
import { Field } from "../../components/ui/form-field";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/feedback";

export function BuyCards() {
  const catalog = useApi<{
    products: {
      id: string;
      brand: string;
      region: string;
      card_type: string;
      rate_kobo: string;
      min_units: string;
      max_units: string;
    }[];
    purchases: GiftPurchase[];
  }>("/gift-cards/purchases");
  const [product, setProduct] = useState("");
  const [units, setUnits] = useState("");
  const [result, setResult] = useState<GiftPurchaseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedProduct = catalog.data?.products.find(
    (item) => item.id === product,
  );
  const estimate =
    selectedProduct &&
    /^[1-9]\d{0,5}$/.test(units) &&
    BigInt(units) >= BigInt(selectedProduct.min_units) &&
    BigInt(units) <= BigInt(selectedProduct.max_units)
      ? formatMoney(
          (BigInt(units) * BigInt(selectedProduct.rate_kobo)).toString(),
        )
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!product) {
      setError("Choose a gift card to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<GiftPurchaseResult>(
          "/gift-cards/purchases",
          mutation(
            result
              ? { action: "confirm", quoteId: result.purchase.id }
              : { action: "quote", productId: product, units },
          ),
        ),
      );
      await catalog.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <p>
          <strong className="block">Purchase preview</strong>
          <span className="mt-1 block text-amber-900/75">
            No money will be charged and no redeemable card will be delivered in
            this environment.
          </span>
        </p>
      </div>
      {error && <ErrorState message={error} />}
      {catalog.loading ? (
        <LoadingState />
      ) : catalog.error ? (
        <ErrorState message={catalog.error} />
      ) : result ? (
        <form
          onSubmit={submit}
          className="space-y-5 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/8 px-3 py-1.5 text-xs font-bold text-brand">
            <BadgeCheck size={14} />
            {result.demoCode ? "Preview complete" : "Quote ready"}
          </span>
          <h2 className="text-xl font-bold">
            {result.demoCode
              ? "Purchase preview completed"
              : "Review purchase quote"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-paper p-4">
              <p className="text-xs text-ink/50">Face value</p>
              <p className="mt-1 font-bold">{result.purchase.units} units</p>
            </div>
            <div className="rounded-2xl bg-brand/5 p-4">
              <p className="text-xs text-ink/50">Estimated price</p>
              <p className="mt-1 font-bold text-brand">
                {formatMoney(result.purchase.amount)}
              </p>
            </div>
          </div>
          {result.demoCode ? (
            <p className="rounded-xl bg-paper p-4 text-sm text-ink/60">
              No redeemable code was issued in this preview.
            </p>
          ) : (
            <>
              <p className="flex items-start gap-2 rounded-xl bg-paper p-3 text-xs leading-5 text-ink/55">
                <Clock3 size={15} className="mt-0.5 shrink-0 text-brand" />
                Expires {new Date(result.purchase.expires_at).toLocaleString()}
              </p>
              <Button disabled={busy}>Confirm purchase</Button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setResult(null);
              setError("");
            }}
            className="inline-flex min-h-11 items-center gap-2 font-bold text-brand"
          >
            Start a new purchase <ArrowRight size={15} />
          </button>
        </form>
      ) : !catalog.data?.products.length ? (
        <EmptyState title="No cards available" />
      ) : (
        <form
          onSubmit={submit}
          className="space-y-5 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/8 px-3 py-1.5 text-xs font-bold text-brand">
              <ArrowRight size={14} /> Buy a gift card
            </span>
            <h2 className="mt-4 text-xl font-bold">Choose your card</h2>
            <p className="mt-1 text-sm text-ink/55">
              Pick a brand and enter its face value to see a price preview.
            </p>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Available brands</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.data.products.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProduct(item.id)}
                  aria-pressed={product === item.id}
                  className={`min-h-24 rounded-2xl border p-4 text-left transition ${product === item.id ? "border-brand bg-brand/5 ring-2 ring-brand/10" : "border-ink/10 bg-white hover:border-brand/45 hover:bg-paper"}`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <strong className="text-sm">{item.brand}</strong>
                    {product === item.id ? (
                      <BadgeCheck size={17} className="text-brand" />
                    ) : (
                      <Gift size={17} className="text-ink/35" />
                    )}
                  </span>
                  <span className="mt-2 block text-xs text-ink/50">
                    {item.region} · {item.card_type}
                  </span>
                  <span className="mt-1 block text-[11px] text-ink/40">
                    {item.min_units}–{item.max_units} units
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <Field
            id="buy-units"
            label="Card face value (whole units)"
            required
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            inputMode="numeric"
            pattern="[1-9][0-9]{0,5}"
          />
          {selectedProduct && (
            <p className="-mt-3 flex items-start gap-2 text-xs leading-5 text-ink/50">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-brand" />
              Face value must be between {selectedProduct.min_units} and{" "}
              {selectedProduct.max_units} units.
            </p>
          )}
          {estimate && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand/5 p-4">
              <span>
                <span className="block text-xs text-ink/50">Price preview</span>
                <span className="mt-1 block text-xs text-ink/60">
                  The final amount is confirmed by your quote.
                </span>
              </span>
              <strong className="text-lg text-brand">{estimate}</strong>
            </div>
          )}
          <Button disabled={busy}>Get purchase quote</Button>
        </form>
      )}
      {catalog.data?.purchases.length ? (
        <div className="space-y-3 pt-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Your purchases</h2>
              <p className="mt-1 text-sm text-ink/50">
                Your recent purchase previews.
              </p>
            </div>
            <span className="rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink/55">
              {catalog.data.purchases.length}
            </span>
          </div>
          {catalog.data.purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand/8 text-brand">
                  <Gift size={19} />
                </span>
                <span>
                  <strong className="block">
                    {purchase.brand ?? "Gift card"}
                  </strong>
                  <span className="mt-1 block text-xs text-ink/50">
                    {purchase.units} units · Preview
                  </span>
                </span>
              </div>
              <span className="text-right">
                <strong className="block">
                  {formatMoney(purchase.amount)}
                </strong>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-ink/45">
                  <Clock3 size={12} /> Not delivered
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
