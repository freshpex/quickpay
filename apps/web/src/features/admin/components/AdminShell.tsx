"use client";
import Link from "next/link";
import { useState } from "react";
import { useApi } from "../../../lib/use-api";
import { api, mutation } from "@quickpay/api-client";
import { Field } from "../../../components/ui/form-field";
import { Button } from "../../../components/ui/button";
import { LoadingState, ErrorState } from "../../../components/feedback";
import { usePathname } from "next/navigation";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Wordmark } from "../../../components/layout/wordmark";
export const adminSections = [
  ["users", "Users & verification"],
  ["transactions", "Transactions"],
  ["catalog", "Services, fees & limits"],
  ["gift-products", "Gift products & rates"],
  ["gifts", "Gift-card reviews"],
  ["exchanges", "Exchange capabilities"],
  ["reward-rules", "Referral rules"],
  ["support", "Support requests"],
  ["operations", "Operations"],
  ["audit", "Audit history"],
];
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const access = useApi<{ allowed: boolean; mfaEnabled: boolean }>(
    "/admin/access",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function unlock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        "/admin/unlock",
        mutation(Object.fromEntries(new FormData(e.currentTarget))),
      );
      await access.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white px-5 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5">
          <Wordmark />
          <p className="flex items-center gap-2 text-sm font-bold text-brand">
            <ShieldCheck size={18} />
            Operations console
          </p>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 text-xs font-bold"
          >
            <ArrowLeft size={15} />
            Customer account
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] md:grid-cols-[240px_1fr]">
        <nav
          aria-label="Admin navigation"
          className="flex gap-2 overflow-x-auto border-b border-ink/10 p-4 md:sticky md:top-0 md:block md:h-screen md:space-y-2 md:border-b-0 md:border-r md:p-6"
        >
          {adminSections.map(([slug, label]) => (
            <Link
              key={slug}
              href={`/admin/${slug}`}
              className={`block min-h-11 shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-xs font-semibold ${path.endsWith(slug) ? "bg-brand text-white" : "hover:bg-brand/5"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main id="main" className="min-w-0 px-5 py-8 md:px-8">
          {access.loading ? (
            <LoadingState />
          ) : access.error ? (
            <div className="space-y-5">
              <ErrorState message={access.error} />
              <Link href="/sign-in" className="font-bold text-brand">
                Sign in with your admin account
              </Link>
            </div>
          ) : access.data?.allowed ? (
            children
          ) : (
            <div className="max-w-md space-y-5">
              <h1 className="text-2xl font-bold">Confirm it’s you.</h1>
              <p className="text-sm leading-relaxed text-ink/60">
                Admin tools require a recent authenticator check. Access lasts
                15 minutes.
              </p>
              {access.data?.mfaEnabled ? (
                <form onSubmit={unlock} className="space-y-5">
                  <Field
                    id="admin-code"
                    name="code"
                    label="Authenticator code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    required
                  />
                  {error && <ErrorState message={error} />}
                  <Button disabled={busy}>Unlock admin tools</Button>
                </form>
              ) : (
                <Link href="/settings" className="font-bold text-brand">
                  Set up two-step verification in Settings
                </Link>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
