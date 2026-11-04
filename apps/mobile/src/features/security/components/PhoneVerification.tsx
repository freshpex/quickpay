import { useState } from "react";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Notice } from "../../../components/feedback/Feedback";
export function PhoneVerification({ onVerified }: { onVerified: () => void }) {
  const [challenge, setChallenge] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <>
      <Button
        title={challenge ? "Send a new code" : "Verify phone number"}
        secondary
        busy={busy}
        onPress={() => {
          if (busy) return;
          setBusy(true);
          void api<{ id: string; message: string }>(
            "/verification/phone/send",
            mutation({}),
          )
            .then((r) => {
              setChallenge(r.id);
              setMessage(r.message);
            })
            .catch((e) => setMessage(e.message))
            .finally(() => setBusy(false));
        }}
      />
      {challenge && (
        <>
          <Input
            label="Six-digit phone code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          <Button
            title="Confirm phone code"
            busy={busy}
            disabled={!/^\d{6}$/.test(code)}
            onPress={() => {
              setBusy(true);
              void api<{ message: string }>(
                "/verification/phone/verify",
                mutation({ id: challenge, code }),
              )
                .then((r) => {
                  setCode("");
                  setChallenge("");
                  setMessage(r.message);
                  onVerified();
                })
                .catch((e) => setMessage(e.message))
                .finally(() => setBusy(false));
            }}
          />
        </>
      )}
      {message && <Notice>{message}</Notice>}
    </>
  );
}
