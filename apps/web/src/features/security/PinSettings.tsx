"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { api, mutation } from "@quickpay/api-client";
import { useApi } from "../../lib/use-api";
import { PasswordInput } from "../../components/ui/password-input";
import { Field } from "../../components/ui/form-field";
import { Button } from "../../components/ui/button";
export function PinSettings() {
  const status = useApi<{ configured: boolean }>("/security/pin"),
    router = useRouter();
  const [reset, setReset] = useState(false),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true);
    setMessage("");
    try {
      const result = await api<{ message: string }>(
        reset ? "/security/pin/reset" : "/security/pin",
        mutation(data),
      );
      setMessage(result.message);
      if (reset && !sent) {
        setSent(true);
        return;
      }
      form.reset();
      setReset(false);
      setSent(false);
      await status.refresh();
      const target = new URLSearchParams(window.location.search).get(
        "returnTo",
      );
      if (
        target &&
        /^\/(deposit|withdraw|airtime|data|bills|referrals)(\/|\?|$)/.test(
          target,
        )
      )
        router.replace(target);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id="transaction-pin"
      className="scroll-mt-6 space-y-5 rounded-2xl border border-brand/15 bg-white p-6 xl:col-span-2"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-brand/10 p-3 text-brand">
          <ShieldCheck size={24} />
        </span>
        <div>
          <h2 className="text-lg font-bold">Transaction PIN</h2>
          <p className="text-sm text-ink/60">
            A separate six-digit PIN for payments, deposits and withdrawals.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="max-w-md space-y-4">
        <PasswordInput
          label="Current login password"
          id="pin-account-password"
          name="password"
          autoComplete="current-password"
          required
        />
        {status.data?.configured && !reset && (
          <PasswordInput
            label="Current transaction PIN"
            id="old-pin"
            name="currentPin"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="off"
            required
          />
        )}
        {reset && sent && (
          <Field
            label="Code sent to your verified email"
            id="reset-pin-code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
          />
        )}
        {(!reset || sent) && (
          <>
            <PasswordInput
              label="New transaction PIN"
              id="new-pin"
              name="newPin"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="off"
              required
            />
            <PasswordInput
              label="Confirm transaction PIN"
              id="confirm-pin"
              name="confirmPin"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="off"
              required
            />
            <p className="text-xs text-ink/60">
              Avoid repeated or sequential digits. Never share your PIN.
            </p>
          </>
        )}
        {!!message && (
          <p role="status" className="rounded-xl bg-paper p-3 text-sm">
            {message}
          </p>
        )}
        {status.error && (
          <p role="alert" className="text-sm text-red-700">
            PIN settings could not load.{" "}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => void status.refresh()}
            >
              Try again
            </button>
          </p>
        )}
        <Button disabled={busy || status.loading || !!status.error}>
          {busy
            ? "Please wait…"
            : reset && !sent
              ? "Email me a reset code"
              : reset
                ? "Reset transaction PIN"
                : status.data?.configured
                  ? "Change transaction PIN"
                  : "Set transaction PIN"}
        </Button>
      </form>
      <button
        type="button"
        className="min-h-11 text-sm font-bold text-brand"
        onClick={() => {
          setReset(!reset);
          setSent(false);
          setMessage("");
        }}
      >
        {reset ? "Back to PIN settings" : "Forgot your transaction PIN?"}
      </button>
    </section>
  );
}
