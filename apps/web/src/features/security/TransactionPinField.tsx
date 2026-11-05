"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "../../lib/use-api";
import { PasswordInput } from "../../components/ui/password-input";
export function TransactionPinField() {
  const status = useApi<{ configured: boolean }>("/security/pin"),
    router = useRouter();
  useEffect(() => {
    if (status.data && !status.data.configured)
      router.push(
        `/settings?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}#transaction-pin`,
      );
  }, [status.data?.configured, router]);
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
