import { router } from "expo-router";
import {
  formatMoney,
  type Wallet,
  type WalletCapabilities,
} from "@quickpay/contracts";
import { Screen } from "../../../components/layout/screen";
import { useResource } from "../../../services/api/use-resource";
import { BalanceCard } from "../components/balance-card";
import { Button } from "../../../components/ui/button";
import { Card, Row } from "../../../components/ui/card/Card";
import {
  Notice,
  LoadingState,
  ErrorState,
} from "../../../components/feedback/Feedback";
export function WalletScreen() {
  const wallet = useResource<Wallet>("/wallet"),
    caps = useResource<WalletCapabilities>("/wallet/capabilities");
  return (
    <Screen
      title="Your wallet."
      onRefresh={() => {
        void wallet.refetch();
        void caps.refetch();
      }}
      refreshing={wallet.isRefetching}
    >
      {wallet.isPending ? (
        <LoadingState />
      ) : wallet.error ? (
        <ErrorState error={wallet.error} retry={() => void wallet.refetch()} />
      ) : (
        <BalanceCard wallet={wallet.data} />
      )}
      <Button
        title="Add money"
        disabled={!caps.data?.deposit.available}
        onPress={() => router.push("/(customer)/wallet/deposit")}
      />
      <Button
        title="Withdraw to your bank"
        secondary
        disabled={!caps.data?.withdrawal.available}
        onPress={() => router.push("/(customer)/wallet/withdraw")}
      />
      {caps.error && (
        <ErrorState error={caps.error} retry={() => void caps.refetch()} />
      )}
      {caps.data && (
        <Card>
          <Row label="Deposit fee" value={formatMoney(caps.data.deposit.fee)} />
          <Row
            label="Withdrawal fee"
            value={formatMoney(caps.data.withdrawal.fee)}
          />
          <Row
            label="Deposit limits"
            value={`${formatMoney(caps.data.deposit.minimum)} – ${formatMoney(caps.data.deposit.maximum)}`}
          />
          <Row
            label="Withdrawal limits"
            value={`${formatMoney(caps.data.withdrawal.minimum)} – ${formatMoney(caps.data.withdrawal.maximum)}`}
          />
        </Card>
      )}
      {caps.data?.deposit.reason && <Notice>{caps.data.deposit.reason}</Notice>}
      {caps.data?.withdrawal.reason && (
        <Notice>{caps.data.withdrawal.reason}</Notice>
      )}
    </Screen>
  );
}
