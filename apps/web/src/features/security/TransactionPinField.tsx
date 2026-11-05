"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useApi } from "../../lib/use-api";
import { PasswordInput } from "../../components/ui/password-input";
export function TransactionPinField({
  onReady,
}: {
  onReady?: (ready: boolean) => void;
}) {
  const status = useApi<{ configured: boolean }>("/security/pin"),
    router = useRouter();
  useEffect(() => {
    onReady?.(!!status.data?.configured && !status.error);
  }, [status.data?.configured, status.error, onReady]);
  if (status.data && !status.data.configured)
    return (
      <div
        role="status"
        className="rounded-2xl border border-brand/20 bg-brand/5 p-5"
      >
        <ShieldCheck size={24} className="mb-3 text-brand" />
        <h2 className="font-bold">Set up your transaction PIN to continue</h2>
        <p className="my-3 text-sm leading-relaxed text-ink/70">
          Protect your payments with a six-digit PIN. You’ll confirm your
          current login password and choose a new PIN in Settings, then return
          here. No payment has been submitted.
        </p>
        <button
          type="button"
          className="min-h-12 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white"
          onClick={() =>
            router.push(
              `/settings?setup=pin&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}#transaction-pin`,
            )
          }
        >
          Set up PIN and continue
        </button>
      </div>
    );
  return (
    <div className="rounded-2xl border border-brand/15 bg-paper p-5">
      <PasswordInput
        label="Transaction PIN"
        id="transaction-pin-input"
        name="pin"
        inputMode="numeric"
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        autoComplete="off"
        required
        disabled={!status.data?.configured}
      />
      <p className="mt-2 text-xs leading-relaxed text-ink/60">
        Enter your six-digit payment PIN. It is different from your login
        password and authenticator code.
      </p>
      {status.error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {status.error}{" "}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => void status.refresh()}
          >
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
