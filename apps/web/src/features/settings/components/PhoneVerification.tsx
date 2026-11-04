"use client";
import { useState } from "react";
import { toast } from "sonner";
import { api, mutation } from "@quickpay/api-client";
import { useApi } from "../../../lib/use-api";
import { Button } from "../../../components/ui/button";
import { Field } from "../../../components/ui/form-field";
export function PhoneVerification({
  verified,
  onVerified,
}: {
  verified: boolean;
  onVerified: () => void;
}) {
  const capabilities = useApi<{ phone: boolean }>("/verification/capabilities");
  const [challenge, setChallenge] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      const r = await api<{ id: string; message: string }>(
        "/verification/phone/send",
        mutation({}),
      );
      setChallenge(r.id);
      toast.success(r.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    try {
      await api(
        "/verification/phone/verify",
        mutation({ id: challenge, code }),
      );
      setChallenge("");
      toast.success("Your phone number is verified.");
      onVerified();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (verified)
    return <p className="text-xs text-green-700">Phone verified.</p>;
  if (!capabilities.data?.phone)
    return (
      <p className="text-xs leading-relaxed text-ink/55">
        Phone verification is not available yet. Contact support if you need to
        change your number.
      </p>
    );
  return (
    <div className="space-y-4">
      <Button type="button" disabled={busy} onClick={send}>
        {challenge ? "Send a new code" : "Verify phone number"}
      </Button>
      {challenge && (
        <div className="space-y-4">
          <Field
            label="Code sent to your phone"
            id="phone-code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
          />
          <Button
            type="button"
            disabled={busy || code.length !== 6}
            onClick={verify}
          >
            Confirm phone number
          </Button>
        </div>
      )}
    </div>
  );
}
