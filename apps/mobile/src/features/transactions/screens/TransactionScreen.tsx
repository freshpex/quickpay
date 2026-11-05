import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppState, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeIn } from "react-native-reanimated";
import { CircleCheck, Clock3, RotateCcw } from "lucide-react-native";
import { formatMoney, type Transaction } from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { Screen } from "../../../components/layout/screen";
import { Button } from "../../../components/ui/button";
import { Card, Row } from "../../../components/ui/card/Card";
import {
  LoadingState,
  ErrorState,
  Notice,
} from "../../../components/feedback/Feedback";
import {
  isPending,
  localDate,
  statusLabels,
  transactionExplanation,
} from "../lib/status";
import { validTransactionId } from "../../../services/deep-links/validate";
import { loadPending, savePending } from "../services/native-operation";
import { ReceiptMenu } from "../components/ReceiptMenu";
export function safeCheckout(value: unknown) {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      u.hostname === "checkout.paystack.com"
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function TransactionScreen() {
  const cache = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const valid = validTransactionId(id);
  const query = useResource<{ transaction: Transaction }>(
    `/payments/${valid ? id : "invalid"}`,
    { enabled: valid },
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const t = query.data?.transaction;
  useEffect(() => {
    if (!t) return;
    for (const key of [
      "/wallet",
      "/payments",
      "history",
      "/referrals",
      "/notifications",
    ])
      void cache.invalidateQueries({ queryKey: [t.userId, key] });
  }, [cache, t?.id, t?.status]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && valid) void query.refetch();
    });
    return () => sub.remove();
  }, [valid, query.refetch]);
  useEffect(() => {
    if (t && !isPending(t.status))
      void loadPending().then((p) => {
        if (p?.transactionId === t.id) return savePending(null);
      });
  }, [t?.id, t?.status]);
  useEffect(() => {
    if (!t || !isPending(t.status)) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void query.refetch();
    }, 30000);
    return () => clearInterval(timer);
  }, [t?.id, t?.status, query.refetch]);
  const checkout = safeCheckout(t?.details.checkoutUrl);
  return (
    <Screen
      title="Transaction details."
      onRefresh={() => void query.refetch()}
      refreshing={false}
    >
      {!valid ? (
        <Notice danger>This transaction link is invalid.</Notice>
      ) : query.isPending ? (
        <LoadingState />
      ) : query.error && !query.data ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        t && (
          <>
            <ReceiptMenu id={t.id} />
            <Animated.View
              key={t.status}
              entering={FadeIn.duration(180)}
              className="items-center gap-3 rounded-[32px] bg-deep p-7"
            >
              {t.status === "successful" ? (
                <CircleCheck size={48} color="#D9F86C" />
              ) : t.status === "reversed" ? (
                <RotateCcw size={48} color="#D9F86C" />
              ) : (
                <Clock3 size={48} color="white" />
              )}
              <Text className="text-base font-semibold text-white/80">
                {statusLabels[t.status]}
              </Text>
              <Text className="text-center text-4xl font-extrabold text-white">
                {formatMoney(t.amount)}
              </Text>
            </Animated.View>
            <Notice>{transactionExplanation(t)}</Notice>
            <Card>
              <Row label="Type" value={t.serviceId || t.kind} />
              <Row label="Fee" value={formatMoney(t.fee)} />
              <Row label="Reference" value={t.reference} />
              <Row label="Date (Lagos)" value={localDate(t.createdAt)} />
              {typeof t.details.beneficiary === "string" && (
                <Row label="Recipient" value={t.details.beneficiary} />
              )}
              {typeof t.details.accountName === "string" && (
                <Row label="Account name" value={t.details.accountName} />
              )}
            </Card>
            {t.status === "successful" && t.details.fulfillment != null && (
              <Card>
                <Text className="text-lg font-bold text-ink">
                  Fulfillment details
                </Text>
                <Text selectable className="text-base leading-6 text-ink">
                  {typeof t.details.fulfillment === "string"
                    ? t.details.fulfillment
                    : JSON.stringify(t.details.fulfillment, null, 2)}
                </Text>
              </Card>
            )}
            {checkout && isPending(t.status) && (
              <Button
                title="Open secure checkout"
                busy={busy}
                onPress={() => {
                  setBusy(true);
                  void WebBrowser.openBrowserAsync(checkout)
                    .then(() => query.refetch())
                    .catch((e) => setMessage(e.message))
                    .finally(() => setBusy(false));
                }}
              />
            )}
            {isPending(t.status) && (
              <Button
                title="Check payment status"
                secondary
                busy={busy}
                onPress={() => {
                  setBusy(true);
                  void api<{ message: string }>(
                    `/payments/${t.id}/check`,
                    mutation({}),
                  )
                    .then((r) => {
                      setMessage(r.message);
                      return query.refetch();
                    })
                    .catch((e) => setMessage(e.message))
                    .finally(() => setBusy(false));
                }}
              />
            )}
            {message && <Notice>{message}</Notice>}
            <Button
              title="Get help with this transaction"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/(customer)/support",
                  params: { transactionId: t.id },
                })
              }
            />
            {t.serviceId && typeof t.details.beneficiary === "string" && (
              <Button
                title="Save this recipient"
                secondary
                onPress={() =>
                  router.push({
                    pathname: "/(customer)/beneficiaries",
                    params: {
                      serviceId: t.serviceId!,
                      account: String(t.details.beneficiary),
                    },
                  })
                }
              />
            )}
          </>
        )
      )}
    </Screen>
  );
}
