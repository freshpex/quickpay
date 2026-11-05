"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, mutation } from "@quickpay/api-client";
import { Field } from "../../../../components/ui/form-field";
import { PasswordInput } from "../../../../components/ui/password-input";
import { Button } from "../../../../components/ui/button";
import { useConnection } from "../../../../components/feedback/connection-status/ConnectionStatus";
export function SignInForm() {
  const router = useRouter();
  const { phase } = useConnection();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [mfa, setMfa] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const v = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mfa) {
        await api("/auth/two-factor/verify-totp", mutation({ code: v.code }));
        router.push("/dashboard");
      } else {
        const result = await api<{ twoFactorRedirect?: boolean }>(
          "/auth/sign-in/email",
          mutation({ email: v.email, password: v.password }),
        );
        if (result.twoFactorRedirect) setMfa(true);
        else router.push("/dashboard");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      {mfa ? (
        <Field
          label="Authenticator code"
          id="code"
          name="code"
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          required
        />
      ) : (
        <>
          <Field
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
          <PasswordInput
            label="Password"
            id="password"
            name="password"
            autoComplete="current-password"
            required
          />
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-brand"
            >
              Forgot your password?
            </Link>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button disabled={busy} className="w-full">
        {busy
          ? phase === "slow"
            ? "Waiting for service…"
            : phase === "connecting"
              ? "Securing connection…"
              : "Signing you in…"
          : mfa
            ? "Verify and sign in"
            : "Sign in"}
      </Button>
      <p className="text-center text-sm text-ink/60">
        New here?{" "}
        <Link href="/sign-up" className="font-bold text-brand">
          Create an account
        </Link>
      </p>
    </form>
  );
}
