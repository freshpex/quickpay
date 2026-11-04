import { useState } from "react";
import { Text } from "react-native";
import { formatMoney } from "@quickpay/contracts";
import { Sheet } from "../../../../components/ui/bottom-sheet/Sheet";
import { Row } from "../../../../components/ui/card/Card";
import { PasswordInput } from "../../../../components/ui/password-input";
import { Button } from "../../../../components/ui/button";
import { Notice } from "../../../../components/feedback/Feedback";
export function PaymentReview({
  open,
  onClose,
  amount,
  fee,
  recipient,
  authorize = true,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  amount: string;
  fee: string;
  recipient: string;
  authorize?: boolean;
  onConfirm: (password?: string) => Promise<void>;
}) {
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const close = () => {
    if (!busy) {
      setPassword("");
      setError("");
      onClose();
    }
  };
  return (
    <Sheet open={open} onClose={close} dismissible={!busy}>
      <Text
        accessibilityRole="header"
        className="text-2xl font-extrabold text-ink"
      >
        One last look.
      </Text>
      <Row label="To" value={recipient} />
      <Row label="Amount" value={formatMoney(amount)} />
      <Row label="Fee" value={formatMoney(fee)} />
      <Row label="Total" value={formatMoney(BigInt(amount) + BigInt(fee))} />
      {authorize && (
        <PasswordInput
          label="Account password"
          value={password}
          onChangeText={setPassword}
          textContentType="password"
          autoComplete="current-password"
        />
      )}
      {error && <Notice danger>{error}</Notice>}
      <Button
        title={authorize ? "Authorize payment" : "Continue to checkout"}
        busy={busy}
        disabled={authorize && !password}
        onPress={() => {
          if (busy) return;
          setBusy(true);
          setError("");
          void onConfirm(authorize ? password : undefined)
            .then(() => {
              setPassword("");
              onClose();
            })
            .catch((e) => {
              setError(e.message);
              setPassword("");
            })
            .finally(() => setBusy(false));
        }}
      />
      <Button title="Go back" secondary disabled={busy} onPress={close} />
    </Sheet>
  );
}
