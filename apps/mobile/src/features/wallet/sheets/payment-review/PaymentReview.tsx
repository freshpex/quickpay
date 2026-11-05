import { useState } from "react";
import { Text } from "react-native";
import { formatMoney } from "@quickpay/contracts";
import { Sheet } from "../../../../components/ui/bottom-sheet/Sheet";
import { Row } from "../../../../components/ui/card/Card";
import { TransactionPinInput } from "../../../security/components/TransactionPinInput";
import { Button } from "../../../../components/ui/button";
import { Notice } from "../../../../components/feedback/Feedback";
export function PaymentReview({
  open,
  onClose,
  amount,
  fee,
  recipient,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  amount: string;
  fee: string;
  recipient: string;
  onConfirm: (pin: string) => Promise<void>;
}) {
  const [pin, setPin] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const close = () => {
    if (!busy) {
      setPin("");
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
      <TransactionPinInput value={pin} onChange={setPin} onSetup={close} />
      {error && <Notice danger>{error}</Notice>}
      <Button
        title="Confirm with PIN"
        busy={busy}
        disabled={!/^\d{6}$/.test(pin)}
        onPress={() => {
          if (busy) return;
          setBusy(true);
          setError("");
          void onConfirm(pin)
            .then(() => {
              setPin("");
              onClose();
            })
            .catch((e) => {
              setError(e.message);
              setPin("");
            })
            .finally(() => setBusy(false));
        }}
      />
      <Button title="Go back" secondary disabled={busy} onPress={close} />
    </Sheet>
  );
}
