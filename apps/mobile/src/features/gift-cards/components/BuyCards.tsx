import { useState } from "react";
import { Text } from "react-native";
import { mutation } from "@quickpay/api-client";
import {
  formatMoney,
  type GiftProduct,
  type GiftPurchase,
  type GiftPurchaseResult,
} from "@quickpay/contracts";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Choice } from "../../../components/ui/choice/Choice";
import {
  Notice,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/feedback/Feedback";
import { Card, Row } from "../../../components/ui/card/Card";

export function BuyCards() {
  const catalog = useResource<{
    products: GiftProduct[];
    purchases: GiftPurchase[];
  }>("/gift-cards/purchases");
  const [product, setProduct] = useState("");
  const [units, setUnits] = useState("");
  const [result, setResult] = useState<GiftPurchaseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
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
      await catalog.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Notice>
        Sandbox purchase demo. No wallet debit or real card delivery. Prices and
        codes are illustrative.
      </Notice>
      {catalog.isPending ? (
        <LoadingState />
      ) : catalog.error ? (
        <ErrorState
          error={catalog.error}
          retry={() => void catalog.refetch()}
        />
      ) : result ? (
        <Card>
          <Row label="Face value" value={result.purchase.units} />
          <Row label="Demo price" value={formatMoney(result.purchase.amount)} />
          {result.demoCode ? (
            <Notice>Demo purchase completed. Code: {result.demoCode}</Notice>
          ) : (
            <>
              <Notice>
                Quote expires{" "}
                {new Date(result.purchase.expires_at).toLocaleString()}.
              </Notice>
              <Button
                title="Confirm sandbox purchase"
                busy={busy}
                onPress={() => void submit()}
              />
            </>
          )}
          <Button
            title="Start a new purchase"
            secondary
            disabled={busy}
            onPress={() => {
              setResult(null);
              setError("");
            }}
          />
        </Card>
      ) : !catalog.data.products.length ? (
        <EmptyState title="No cards available" body="Try again later." />
      ) : (
        <>
          {catalog.data.products.map((p) => (
            <Choice
              key={p.id}
              label={`${p.brand} · ${p.region}`}
              detail={`${p.min_units}–${p.max_units} units`}
              selected={product === p.id}
              onPress={() => setProduct(p.id)}
            />
          ))}
          <Input
            label="Card face value (whole units)"
            value={units}
            onChangeText={setUnits}
            keyboardType="number-pad"
          />
          <Button
            title="Get purchase quote"
            disabled={!product || !/^[1-9]\d{0,5}$/.test(units)}
            busy={busy}
            onPress={() => void submit()}
          />
        </>
      )}
      {error && <Notice danger>{error}</Notice>}
      <Text className="text-xl font-bold text-ink">Your sandbox purchases</Text>
      {catalog.data?.purchases.map((p) => (
        <Card key={p.id}>
          <Row label={p.brand || "Gift card"} value={formatMoney(p.amount)} />
          <Text selectable>DEMO-NOT-REDEEMABLE-{p.id}</Text>
        </Card>
      ))}
    </>
  );
}
