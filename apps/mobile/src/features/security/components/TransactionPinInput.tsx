import { Text } from "react-native";
import { router } from "expo-router";
import { useResource } from "../../../services/api/use-resource";
import { PasswordInput } from "../../../components/ui/password-input";
import { Button } from "../../../components/ui/button";
import { Notice } from "../../../components/feedback/Feedback";
export function TransactionPinInput({
  value,
  onChange,
  onSetup,
}: {
  value: string;
  onChange: (value: string) => void;
  onSetup?: () => void;
}) {
  const status = useResource<{ configured: boolean }>("/security/pin");
  const setup = () => {
    onSetup?.();
    router.push({ pathname: "/(customer)/security", params: { setup: "pin" } });
  };
  if (status.data && !status.data.configured)
    return (
      <>
        <Text className="text-lg font-bold text-ink">
          Set up your transaction PIN to continue
        </Text>
        <Notice>
          Protect your payments with a six-digit PIN. Confirm your current login
          password and choose a new PIN in Security settings, then return to
          your payment. No payment has been submitted.
        </Notice>
        <Button title="Set up PIN and continue" onPress={setup} />
      </>
    );
  return (
    <>
      <PasswordInput
        label="Transaction PIN"
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="off"
        editable={status.data?.configured === true}
      />
      <Notice>
        Use your six-digit payment PIN, not your login password or authenticator
        code.
      </Notice>
      {status.error && (
        <>
          <Notice danger>We could not load your PIN settings.</Notice>
          <Button
            secondary
            title="Retry PIN settings"
            onPress={() => void status.refetch()}
          />
        </>
      )}
    </>
  );
}
