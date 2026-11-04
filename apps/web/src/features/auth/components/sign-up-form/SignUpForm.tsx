"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { signUpSchema } from "@quickpay/contracts";
import { api, mutation, ApiFailure } from "@quickpay/api-client";
import { Field } from "../../../../components/ui/form-field";
import { PasswordInput } from "../../../../components/ui/password-input";
import { Button } from "../../../../components/ui/button";
import { toast } from "sonner";
import { useConnection } from "../../../../components/feedback/connection-status/ConnectionStatus";
export function SignUpForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const { phase } = useConnection();
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  function showErrors(next: Record<string, string>) {
    setErrors(next);
    toast.error(next.form || "Please check the marked fields below.");
    const field = Array.from(formRef.current?.elements || []).find(
      (element) => element instanceof HTMLInputElement && !!next[element.name],
    );
    if (field instanceof HTMLInputElement) {
      field.focus();
      field.scrollIntoView({ block: "center" });
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const raw = {
      ...Object.fromEntries(data),
      terms: data.get("terms") === "on",
    };
    const parsed = signUpSchema.safeParse(raw);
    if (!parsed.success) {
      showErrors(
        Object.fromEntries(
          parsed.error.issues.map((e) => [e.path[0], e.message]),
        ),
      );
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await api("/auth/sign-up/email", mutation(parsed.data));
      setDone(true);
    } catch (e) {
      showErrors(
        e instanceof ApiFailure
          ? {
              ...Object.fromEntries(
                Object.entries(e.details.fields || {}).map(([k, v]) => [
                  k,
                  v[0],
                ]),
              ),
              form: e.message,
            }
          : { form: "We could not create your account. Please try again." },
      );
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div
        role="status"
        className="rounded-2xl border border-brand/20 bg-white p-6"
      >
        <h2 className="text-xl font-bold">Check your email.</h2>
        <p className="my-4 text-sm leading-relaxed text-ink/60">
          Open the verification link we sent you. Then sign in to start using
          your account. If you can't find the email, check your spam tab or
          contact support after 5 minutes of not rceiveing an email
        </p>
        <Link href="/sign-in" className="font-bold text-brand">
          Continue to sign in
        </Link>
      </div>
    );
  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      <Field
        label="Full name"
        id="name"
        name="name"
        autoComplete="name"
        required
        error={errors.name}
      />
      <Field
        label="Email address"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <Field
        label="Nigerian phone number"
        id="phoneNumber"
        name="phoneNumber"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0801 234 5678"
        required
        error={errors.phoneNumber}
      />
      <PasswordInput
        label="Password"
        id="password"
        name="password"
        autoComplete="new-password"
        aria-describedby="password-help"
        required
        error={errors.password}
      />
      <p
        id="password-help"
        className="-mt-2 text-xs leading-relaxed text-ink/60"
      >
        At least 12 characters, with an uppercase letter, a lowercase letter and
        a number.
      </p>
      <PasswordInput
        label="Confirm password"
        id="confirmPassword"
        name="confirmPassword"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />
      <Field
        label="Referral code (optional)"
        id="referralCode"
        name="referralCode"
        autoComplete="off"
        error={errors.referralCode}
      />
      <label className="flex items-start gap-3 text-xs leading-relaxed">
        <input
          id="terms"
          name="terms"
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-brand"
          aria-describedby={errors.terms ? "terms-error" : undefined}
          aria-invalid={!!errors.terms}
        />
        <span>
          I accept the{" "}
          <Link
            href="/terms"
            target="_blank"
            className="font-semibold text-brand underline"
          >
            Terms and Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="font-semibold text-brand underline"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {errors.terms && (
        <p id="terms-error" className="text-sm text-red-700">
          {errors.terms}
        </p>
      )}
      {errors.form && (
        <p role="alert" className="text-sm text-red-700">
          {errors.form}
        </p>
      )}
      <Button disabled={busy} className="w-full">
        {busy
          ? phase === "connecting" || phase === "slow"
            ? "Securing connection…"
            : "Creating your account…"
          : "Create account"}
      </Button>
      <p className="text-center text-sm text-ink/60">
        Already with us?{" "}
        <Link href="/sign-in" className="font-bold text-brand">
          Sign in
        </Link>
      </p>
    </form>
  );
}
