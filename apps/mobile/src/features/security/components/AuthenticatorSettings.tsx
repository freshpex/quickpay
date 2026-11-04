import { useState } from "react";
import { Linking, Text } from "react-native";
import { authClient } from "../../../services/session/auth-client";
import { PasswordInput } from "../../../components/ui/password-input";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Notice } from "../../../components/feedback/Feedback";
export function AuthenticatorSettings({
  enabled,
  onChanged,
}: {
  enabled: boolean;
  onChanged: () => void;
}) {
  const [password, setPassword] = useState(""),
    [setup, setSetup] = useState<{
      totpURI: string;
      backupCodes: string[];
    } | null>(null),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const run = (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    void fn()
      .catch((e) => setMessage(e.message))
      .finally(() => {
        setBusy(false);
        setPassword("");
      });
  };
  return (
    <>
      <Text className="text-lg font-bold text-ink">Two-step verification</Text>
      <Notice>
        {enabled
          ? "Your authenticator protects sign-in."
          : "Add an authenticator code to protect your sign-in."}
      </Notice>
      {!setup ? (
        <>
          <PasswordInput
            label="Account password for authenticator settings"
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
          />
          <Button
            title={enabled ? "Turn off authenticator" : "Set up authenticator"}
            secondary
            busy={busy}
            disabled={!password}
            onPress={() =>
              run(async () => {
                if (enabled) {
                  const r = await authClient.twoFactor.disable({ password });
                  if (r.error) throw new Error(r.error.message);
                  onChanged();
                  setMessage("Two-step verification turned off.");
                } else {
                  const r = await authClient.twoFactor.enable({ password });
                  if (r.error) throw new Error(r.error.message);
                  if (r.data && "totpURI" in r.data) setSetup(r.data);
                  else
                    throw new Error(
                      "Authenticator setup is unavailable. Please contact support.",
                    );
                }
              })
            }
          />
        </>
      ) : (
        <>
          <Notice>
            Save your backup codes somewhere private. They are shown only during
            setup.
          </Notice>
          <Text selectable className="text-base leading-7 text-ink">
            {setup.backupCodes.join("\n")}
          </Text>
          <Button
            title="Open authenticator app"
            secondary
            onPress={() => {
              void Linking.openURL(setup.totpURI).catch(() =>
                setMessage(
                  "Install an authenticator app, then use the setup key below.",
                ),
              );
            }}
          />
          <Text selectable className="text-sm leading-6 text-muted">
            Setup key: {new URL(setup.totpURI).searchParams.get("secret")}
          </Text>
          <Input
            label="Authenticator confirmation code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button
            title="Verify authenticator"
            busy={busy}
            disabled={!/^\d{6}$/.test(code)}
            onPress={() =>
              run(async () => {
                const r = await authClient.twoFactor.verifyTotp({ code });
                if (r.error) throw new Error(r.error.message);
                setCode("");
                setSetup(null);
                onChanged();
                setMessage("Your authenticator is enabled.");
              })
            }
          />
        </>
      )}
      {message && <Notice>{message}</Notice>}
    </>
  );
}
