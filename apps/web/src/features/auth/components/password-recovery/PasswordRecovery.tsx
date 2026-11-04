"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { password } from "@quickpay/contracts";
import { api, mutation } from "@quickpay/api-client";
import { Field } from "../../../../components/ui/form-field";
import { PasswordInput } from "../../../../components/ui/password-input";
import { Button } from "../../../../components/ui/button";
export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const [token, setToken] = useState("");
  useEffect(
    () =>
      setToken(new URLSearchParams(window.location.search).get("token") || ""),
    [],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    if (reset) {
      const p = password.safeParse(v.password);
      if (!p.success) {
        setError(p.error.issues[0].message);
        return;
      }
      if (v.password !== v.confirmPassword) {
        setError("Your passwords do not match.");
        return;
      }
      if (!token) {
        setError("Open the reset link from your email, or request a new one.");
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      await api(
        reset ? "/auth/reset-password" : "/auth/request-password-reset",
        mutation(
          reset ? { token, newPassword: v.password } : { email: v.email },
        ),
      );
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div role="status" className="space-y-5 rounded-xl bg-white p-6">
        <p>
          {reset
            ? "Your password has been updated. Sign in with your new password."
            : "If that email is registered, a reset link is on its way."}
        </p>
        <Link href="/sign-in" className="font-bold text-brand">
          Back to sign in
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-6">
      {reset ? (
        <>
          <PasswordInput
            label="New password"
            id="password"
            name="password"
            autoComplete="new-password"
            required
          />
          <p className="text-xs text-ink/60">
            At least 12 characters, with uppercase, lowercase and a number.
          </p>
          <PasswordInput
            label="Confirm new password"
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
          />
        </>
      ) : (
        <Field
          label="Email address"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button className="w-full" disabled={busy}>
        {busy ? "Please wait…" : reset ? "Reset password" : "Send reset link"}
      </Button>
    </form>
  );
}
