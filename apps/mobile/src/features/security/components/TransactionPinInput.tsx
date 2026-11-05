import { useEffect, useRef } from "react";
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
  const status = useResource<{ configured: boolean }>("/security/pin"),
    redirected = useRef(false);
  const setup = () => {
    onSetup?.();
    router.push({ pathname: "/(customer)/security", params: { setup: "pin" } });
  };
  useEffect(() => {
    if (status.data && !status.data.configured && !redirected.current) {
      redirected.current = true;
      setup();
    }
  }, [status.data?.configured]);
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
      {status.data && !status.data.configured && (
        <Button title="Set up transaction PIN" secondary onPress={setup} />
      )}
    </>
  );
}
