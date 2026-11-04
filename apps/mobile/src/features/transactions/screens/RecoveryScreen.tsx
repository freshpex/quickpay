import { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { formatMoney, type Transaction } from "@quickpay/contracts";
import { Screen } from "../../../components/layout/screen";
import { Button } from "../../../components/ui/button";
import { PasswordInput } from "../../../components/ui/password-input";
import { Card, Row } from "../../../components/ui/card/Card";
import {
  Notice,
  LoadingState,
  ErrorState,
} from "../../../components/feedback/Feedback";
import { api } from "../../../services/api";
import { useSession } from "../../../providers/SessionProvider";
import {
  loadPending,
  operations,
  savePending,
} from "../services/native-operation";
export function RecoveryScreen() {
  const { session } = useSession();
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const pending = useQuery({
    queryKey: [session?.user.id, "pending-operation"],
    queryFn: loadPending,
  });
  const p = pending.data?.userId === session?.user.id ? pending.data : null;
  const check = async () => {
    if (!p) return;
    setBusy(true);
    try {
      const { transaction } = await api<{ transaction: Transaction | null }>(
        `/payments/by-key/${p.key}`,
      );
      if (transaction)
        router.replace(`/(customer)/transactions/${transaction.id}`);
      else
        setMessage(
          "No transaction was found for this request. You can submit the original request again with the same reference. An interrupted request may still finish; the same reference prevents a duplicate.",
        );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title="Pick up safely.">
      {pending.isPending ? (
        <LoadingState />
      ) : pending.error ? (
        <ErrorState
          error={pending.error}
          retry={() => void pending.refetch()}
        />
      ) : !p ? (
        <Notice>No interrupted request is stored on this device.</Notice>
      ) : (
        <>
          <Card>
            <Row label="Operation" value={p.kind} />
            <Row label="Amount" value={formatMoney(String(p.body.amount))} />
            <Row label="Request reference" value={p.key} />
          </Card>
          <Notice>
            Check the current status first. Re-submitting uses the original
            request and reference. No payment is sent automatically.
          </Notice>
          <Button
            title="Check current status"
            busy={busy}
            onPress={() => void check()}
          />
          {message && <Notice>{message}</Notice>}
          {!p.transactionId && (
            <>
              {p.kind !== "deposit" && (
                <PasswordInput
                  label="Account password"
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="current-password"
                />
              )}
              <Button
                title="Submit original request again"
                secondary
                busy={busy}
                disabled={p.kind !== "deposit" && !password}
                onPress={() => {
                  setBusy(true);
                  void operations
                    .retry(session!.user.id, password)
                    .then((t) =>
                      router.replace(`/(customer)/transactions/${t.id}`),
                    )
                    .catch((e) => setMessage(e.message))
                    .finally(() => {
                      setPassword("");
                      setBusy(false);
                    });
                }}
              />
            </>
          )}
          <Button
            title="Back to activity"
            secondary
            onPress={() => router.replace("/(customer)/(tabs)/activity")}
          />
          {p.transactionId && (
            <Button
              title="Open this transaction"
              secondary
              onPress={() =>
                router.replace(`/(customer)/transactions/${p.transactionId}`)
              }
            />
          )}
          {/* Only known, persisted transactions may release the local request guard. */}
          {p.transactionId && (
            <Button
              title="Keep tracking in activity"
              secondary
              onPress={() => {
                void savePending(null).then(() =>
                  router.replace("/(customer)/(tabs)/activity"),
                );
              }}
            />
          )}
        </>
      )}
    </Screen>
  );
}
