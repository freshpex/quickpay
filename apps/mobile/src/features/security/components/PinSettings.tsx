import { useState } from "react";
import { Text, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../../services/api";
import { mutation } from "@quickpay/api-client";
import { useResource } from "../../../services/api/use-resource";
import { PasswordInput } from "../../../components/ui/password-input";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Notice } from "../../../components/feedback/Feedback";
import { Card } from "../../../components/ui/card/Card";
export function PinSettings() {
  const status = useResource<{ configured: boolean }>("/security/pin"),
    params = useLocalSearchParams<{ setup?: string }>();
  const [password, setPassword] = useState(""),
    [pin, setPin] = useState(""),
    [confirm, setConfirm] = useState(""),
    [current, setCurrent] = useState(""),
    [code, setCode] = useState(""),
    [reset, setReset] = useState(false),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const digits = (set: (v: string) => void) => (v: string) =>
    set(v.replace(/\D/g, "").slice(0, 6));
  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await api<{ message: string }>(
        reset ? "/security/pin/reset" : "/security/pin",
        mutation({
          password,
          ...(!reset || sent ? { newPin: pin, confirmPin: confirm } : {}),
          ...(!reset && status.data?.configured ? { currentPin: current } : {}),
          ...(reset && sent ? { code } : {}),
        }),
      );
      setMessage(response.message);
      if (reset && !sent) {
        setSent(true);
        return;
      }
      setPassword("");
      setPin("");
      setConfirm("");
      setCurrent("");
      setCode("");
      setReset(false);
      setSent(false);
      await status.refetch();
      if (params.setup === "pin" && router.canGoBack()) router.back();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <ShieldCheck size={28} color="#6d28d9" />
        <Text className="text-xl font-extrabold text-ink">Transaction PIN</Text>
      </View>
      {params.setup === "pin" && (
        <Notice>
          Set up your PIN below to continue with your payment. Enter your
          existing login password, then choose and confirm a six-digit
          transaction PIN. After saving, you’ll return to your payment.
        </Notice>
      )}
      <Notice>
        Protect deposits, withdrawals and payments with a separate six-digit
        PIN. Avoid repeated or sequential digits.
      </Notice>
      <PasswordInput
        label="Current login password"
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
      />
      {status.data?.configured && !reset && (
        <PasswordInput
          label="Current transaction PIN"
          value={current}
          onChangeText={digits(setCurrent)}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="off"
        />
      )}
      {reset && sent && (
        <Input
          label="Code sent to your email"
          value={code}
          onChangeText={digits(setCode)}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
        />
      )}
      {(!reset || sent) && (
        <>
          <PasswordInput
            label="New transaction PIN"
            value={pin}
            onChangeText={digits(setPin)}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="off"
          />
          <PasswordInput
            label="Confirm transaction PIN"
            value={confirm}
            onChangeText={digits(setConfirm)}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="off"
          />
        </>
      )}
      {!!message && <Notice>{message}</Notice>}
      {status.error && (
        <>
          <Notice danger>PIN settings could not load.</Notice>
          <Button
            secondary
            title="Retry PIN settings"
            onPress={() => void status.refetch()}
          />
        </>
      )}
      <Button
        title={
          reset && !sent
            ? "Email me a reset code"
            : reset
              ? "Reset transaction PIN"
              : status.data?.configured
                ? "Change transaction PIN"
                : "Set transaction PIN"
        }
        busy={busy}
        disabled={!password || status.isPending || !!status.error}
        onPress={() => void save()}
      />
      <Button
        secondary
        title={reset ? "Back to PIN settings" : "Forgot transaction PIN?"}
        onPress={() => {
          setReset(!reset);
          setSent(false);
          setCode("");
          setMessage("");
        }}
      />
    </Card>
  );
}
