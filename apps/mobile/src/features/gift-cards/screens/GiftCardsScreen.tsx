import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { z } from "zod";
import {
  formatMoney,
  type GiftProduct,
  type GiftQuote,
  type GiftSale,
} from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { secure } from "../../../services/secure-storage";
import { Screen } from "../../../components/layout/screen";
import { Button } from "../../../components/ui/button";
import { Choice } from "../../../components/ui/choice/Choice";
import { FormField } from "../../../components/ui/input/FormField";
import { Card, Row } from "../../../components/ui/card/Card";
import {
  Notice,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/feedback/Feedback";
import { useValidatedForm } from "../../../lib/forms";
import { chooseEvidence } from "../api";
import { QuoteCard } from "../components/QuoteCard";
import { localDate } from "../../transactions/lib/status";
type Draft = { quote: GiftQuote; evidenceId?: string };
export function GiftCardsScreen() {
  const products = useResource<{
      products: GiftProduct[];
      buyingAvailable: boolean;
    }>("/gift-cards/products"),
    sales = useResource<{ sales: GiftSale[] }>("/gift-cards/sales", {
      poll: 30000,
    });
  const form = useValidatedForm(
    z.object({
      productId: z.string().min(1, "Choose a card."),
      units: z.string().regex(/^[1-9]\d{0,5}$/, "Enter a whole card value."),
    }),
    { productId: "", units: "" },
  );
  const [draft, setDraft] = useState<Draft | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now());
  const controller = useRef<AbortController | null>(null),
    sending = useRef(false);
  useEffect(() => {
    void secure.get("gift_draft").then((value) => {
      if (value) setDraft(JSON.parse(value));
    });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      controller.current?.abort();
    };
  }, []);
  const update = async (value: Draft | null) => {
    setDraft(value);
    if (value) await secure.set("gift_draft", JSON.stringify(value));
    else await secure.remove("gift_draft");
  };
  const expired = !!draft && new Date(draft.quote.expiresAt).getTime() <= now;
  return (
    <Screen
      title="Cards with possibilities."
      subtitle="Get a quote. Share evidence securely. Track the review."
      onRefresh={() => {
        void products.refetch();
        void sales.refetch();
      }}
      refreshing={sales.isRefetching}
    >
      {products.data?.buyingAvailable === false && (
        <Notice>
          Gift-card buying is currently unavailable. You can sell supported
          cards below.
        </Notice>
      )}
      {draft ? (
        <>
          <QuoteCard quote={draft.quote} expired={expired} />
          {draft.evidenceId ? (
            <Notice>
              Your evidence was uploaded securely. Submit the card for review
              before the quote expires.
            </Notice>
          ) : (
            <Button
              title="Choose and upload card evidence"
              disabled={expired}
              busy={busy}
              onPress={() => {
                if (busy) return;
                setBusy(true);
                controller.current = new AbortController();
                void chooseEvidence(controller.current.signal)
                  .then((e) =>
                    e ? update({ ...draft, evidenceId: e.id }) : undefined,
                  )
                  .catch((e) => setMessage(e.message))
                  .finally(() => setBusy(false));
              }}
            />
          )}
          {busy && (
            <Button
              title="Cancel upload"
              secondary
              onPress={() => controller.current?.abort()}
            />
          )}
          <Button
            title="Submit card for review"
            busy={busy}
            disabled={expired || !draft.evidenceId}
            onPress={() => {
              if (sending.current || !draft.evidenceId) return;
              sending.current = true;
              setBusy(true);
              void api<{ message: string }>(
                "/gift-cards/sales",
                mutation({
                  quoteId: draft.quote.id,
                  evidenceId: draft.evidenceId,
                }),
              )
                .then(async (result) => {
                  setMessage(result.message);
                  await update(null);
                  await sales.refetch();
                })
                .catch((e) => setMessage(e.message))
                .finally(() => {
                  sending.current = false;
                  setBusy(false);
                });
            }}
          />
          <Button
            title={expired ? "Request a fresh quote" : "Start a new quote"}
            secondary
            disabled={busy}
            onPress={() => void update(null)}
          />
        </>
      ) : products.isPending ? (
        <LoadingState />
      ) : products.error ? (
        <ErrorState
          error={products.error}
          retry={() => void products.refetch()}
        />
      ) : !products.data.products.length ? (
        <EmptyState
          title="No cards available right now"
          body="Supported cards will appear here when they’re available."
        />
      ) : (
        <>
          {products.data.products.map((p) => (
            <Choice
              key={p.id}
              label={`${p.brand} · ${p.region}`}
              detail={`${p.card_type} · ${p.min_units}–${p.max_units} units`}
              selected={form.watch("productId") === p.id}
              onPress={() => form.setValue("productId", p.id)}
            />
          ))}
          <FormField
            control={form.control}
            name="units"
            label="Card face value (whole units)"
            keyboardType="number-pad"
          />
          {form.formState.errors.root?.message && (
            <Notice danger>{form.formState.errors.root.message}</Notice>
          )}
          <Button
            title="Get a current quote"
            busy={form.formState.isSubmitting}
            onPress={() =>
              void form.submit(async (v) => {
                const quote = await api<GiftQuote>(
                  "/gift-cards/quotes",
                  mutation(v),
                );
                await update({ quote });
              })()
            }
          />
        </>
      )}
      {message && <Notice>{message}</Notice>}
      <Text accessibilityRole="header" className="text-xl font-bold text-ink">
        Your card sales
      </Text>
      {sales.isPending ? (
        <LoadingState />
      ) : sales.error ? (
        <ErrorState error={sales.error} retry={() => void sales.refetch()} />
      ) : !sales.data.sales.length ? (
        <EmptyState
          title="No card sales yet"
          body="Submitted cards and their settlement status appear here. An upload alone never adds money to your wallet."
        />
      ) : (
        sales.data.sales.map((s) => (
          <Card key={s.id}>
            <Row label={s.brand} value={formatMoney(s.amount)} />
            <Row label="Status" value={s.status.replaceAll("_", " ")} />
            <Row label="Submitted" value={localDate(s.created_at)} />
            {s.reason && <Notice>{s.reason}</Notice>}
            {s.settlement_reference && (
              <Row
                label="Settlement reference"
                value={s.settlement_reference}
              />
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
