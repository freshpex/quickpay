"use client";
import { useState } from "react";
import { toast } from "sonner";
import { api, mutation } from "@quickpay/api-client";
import { useApi } from "../../lib/use-api";
import { Field } from "../../components/ui/form-field";
import { PasswordInput } from "../../components/ui/password-input";
import { Button } from "../../components/ui/button";
import { LoadingState, ErrorState } from "../../components/feedback";
import { password } from "@quickpay/contracts";
import { PhoneVerification } from "./components/PhoneVerification";
type Profile = {
  user: {
    name: string;
    email: string;
    phone_number: string;
    email_verified: boolean;
    phone_verified: boolean;
    two_factor_enabled: boolean;
    policy_version: string;
    policy_accepted_at: string;
  };
};
export function SettingsPage() {
  const r = useApi<Profile>("/profile");
  const [busy, setBusy] = useState(""),
    [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] }>();
  async function request(
    task: string,
    path: string,
    data: unknown,
    method = "POST",
  ) {
    setBusy(task);
    try {
      const result = await api(path, { ...mutation(data), method });
      toast.success(
        task === "email"
          ? "A verification link is on its way."
          : "Your settings have been updated.",
      );
      await r.refresh();
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget,
      v = Object.fromEntries(new FormData(f));
    const parsed = password.safeParse(v.newPassword);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (v.newPassword !== v.confirmPassword) {
      toast.error("Your passwords do not match.");
      return;
    }
    await request("password", "/auth/change-password", {
      currentPassword: v.currentPassword,
      newPassword: v.newPassword,
      revokeOtherSessions: true,
    });
  }
  if (r.loading) return <LoadingState />;
  if (r.error) return <ErrorState message={r.error} />;
  const u = r.data!.user;
  return (
    <section>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        Profile & security
      </h1>
      <div className="grid gap-7 xl:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void request(
              "profile",
              "/profile",
              Object.fromEntries(new FormData(e.currentTarget)),
              "PATCH",
            );
          }}
          className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6"
        >
          <h2 className="text-lg font-bold">Your details</h2>
          <Field
            label="Full name"
            id="name"
            name="name"
            defaultValue={u.name}
            autoComplete="name"
            minLength={3}
            required
          />
          <Field label="Email" id="email" defaultValue={u.email} readOnly />
          <p className="text-xs text-ink/55">
            Email {u.email_verified ? "verified" : "waiting for verification"}.
          </p>
          {!u.email_verified && (
            <Button
              type="button"
              disabled={!!busy}
              onClick={() =>
                request("email", "/auth/send-verification-email", {
                  email: u.email,
                  callbackURL: "/settings",
                })
              }
            >
              Resend verification email
            </Button>
          )}
          <Field
            label="Nigerian phone number"
            id="phone"
            defaultValue={u.phone_number}
            readOnly
          />
          <PhoneVerification
            verified={u.phone_verified}
            onVerified={() => void r.refresh()}
          />
          <Button disabled={!!busy}>Save profile</Button>
          <p className="text-[10px] leading-relaxed text-ink/40">
            Policy version {u.policy_version}, accepted{" "}
            {new Date(u.policy_accepted_at).toLocaleString("en-NG", {
              timeZone: "Africa/Lagos",
            })}
            .
          </p>
        </form>
        <form
          onSubmit={changePassword}
          className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6"
        >
          <h2 className="text-lg font-bold">Change password</h2>
          <PasswordInput
            label="Current password"
            id="currentPassword"
            name="currentPassword"
            autoComplete="current-password"
            required
          />
          <PasswordInput
            label="New password"
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            required
          />
          <p className="text-xs text-ink/55">
            At least 12 characters, with uppercase, lowercase and a number.
          </p>
          <PasswordInput
            label="Confirm new password"
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
          />
          <Button disabled={!!busy}>Update password</Button>
        </form>
        <div className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6 xl:col-span-2">
          <h2 className="text-lg font-bold">Two-step verification</h2>
          <p className="text-sm text-ink/60">
            {u.two_factor_enabled
              ? "Your authenticator adds an extra step when you sign in."
              : "Protect your account with an authenticator app. Required for administrators."}
          </p>
          {!u.two_factor_enabled && !setup && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await request("mfa", "/auth/two-factor/enable", {
                  password: new FormData(e.currentTarget).get("password"),
                });
                if (result)
                  setSetup(
                    result as { totpURI: string; backupCodes: string[] },
                  );
              }}
              className="max-w-md space-y-4"
            >
              <PasswordInput
                id="mfa-password"
                name="password"
                label="Your password"
                autoComplete="current-password"
                required
              />
              <Button disabled={!!busy}>Set up authenticator</Button>
            </form>
          )}
          {setup && (
            <div className="max-w-xl space-y-5 rounded-xl bg-paper p-5">
              <h3 className="font-bold">Add Quick Pay to your authenticator</h3>
              <p className="text-xs text-ink/60">
                Choose “Enter setup key” in your app. Keep this key private.
              </p>
              <code className="block break-all rounded-lg bg-white p-4 text-sm">
                {new URL(setup.totpURI).searchParams.get("secret")}
              </code>
              <p className="text-xs font-bold">
                Save these one-use recovery codes somewhere safe:
              </p>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                {setup.backupCodes.map((c) => (
                  <code key={c}>{c}</code>
                ))}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const result = await request(
                    "verify-mfa",
                    "/auth/two-factor/verify-totp",
                    { code: new FormData(e.currentTarget).get("code") },
                  );
                  if (result) setSetup(undefined);
                }}
                className="space-y-4"
              >
                <Field
                  label="Code from your authenticator"
                  id="mfa-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  required
                />
                <Button disabled={!!busy}>Verify and finish setup</Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
