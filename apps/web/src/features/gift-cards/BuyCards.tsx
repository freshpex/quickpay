"use client";
import { useState } from "react";
import { api, mutation } from "@quickpay/api-client";
import {
  formatMoney,
  type GiftPurchase,
  type GiftPurchaseResult,
} from "@quickpay/contracts";
import { useApi } from "../../lib/use-api";
import { Button } from "../../components/ui/button";
import { Field } from "../../components/ui/form-field";
import { inputClass } from "../../components/ui/password-input";
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
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
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
      <p className="rounded-xl bg-violet-50 p-4 text-sm">
        Sandbox purchase demo. No wallet debit or real card delivery. Prices and
        codes are illustrative.
      </p>
      {error && <ErrorState message={error} />}
      {catalog.loading ? (
        <LoadingState />
      ) : catalog.error ? (
        <ErrorState message={catalog.error} />
      ) : result ? (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6"
        >
          <h2 className="text-xl font-bold">
            {result.demoCode
              ? "Demo purchase completed"
              : "Review purchase quote"}
          </h2>
          <p>Face value: {result.purchase.units} units</p>
          <p>Demo price: {formatMoney(result.purchase.amount)}</p>
          {result.demoCode ? (
            <p className="break-all">{result.demoCode}</p>
          ) : (
            <>
              <p>
                Expires {new Date(result.purchase.expires_at).toLocaleString()}
              </p>
              <Button disabled={busy}>Confirm sandbox purchase</Button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setResult(null);
              setError("");
            }}
            className="block min-h-11 font-bold text-brand"
          >
            Start a new purchase
          </button>
        </form>
      ) : !catalog.data?.products.length ? (
        <EmptyState title="No cards available" />
      ) : (
        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6"
        >
          <label className="block font-bold" htmlFor="buy-product">
            Choose a sandbox card
          </label>
          <select
            id="buy-product"
            required
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className={inputClass}
          >
            <option value="">Choose a card</option>
            {catalog.data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} · {p.region} · {p.min_units}–{p.max_units} units
              </option>
            ))}
          </select>
          <Field
            id="buy-units"
            label="Card face value (whole units)"
            required
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            inputMode="numeric"
            pattern="[1-9][0-9]{0,5}"
          />
          <Button disabled={busy}>Get purchase quote</Button>
        </form>
      )}
      <h2 className="text-xl font-bold">Your sandbox purchases</h2>
      {catalog.data?.purchases.map((p) => (
        <div
          key={p.id}
          className="space-y-2 rounded-xl border border-ink/10 bg-white p-5"
        >
          <p>
            {p.brand} · {formatMoney(p.amount)}
          </p>
          <p className="break-all">DEMO-NOT-REDEEMABLE-{p.id}</p>
        </div>
      ))}
    </div>
  );
}
