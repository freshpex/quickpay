"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api, mutation } from "@quickpay/api-client";
import { useApi } from "../../lib/use-api";
import { Field } from "../../components/ui/form-field";
import { inputClass } from "../../components/ui/password-input";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/ui/status-badge";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../components/feedback";
export function SupportPage() {
  const requests = useApi<{
    requests: {
      id: string;
      subject: string;
      message: string;
      status: string;
      response?: string;
    }[];
  }>("/support");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [transaction, setTransaction] = useState("");
  useEffect(
    () =>
      setTransaction(
        new URLSearchParams(window.location.search).get("transaction") || "",
      ),
    [],
  );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api(
        "/support",
        mutation({
          ...Object.fromEntries(new FormData(form)),
          ...(transaction ? { transactionId: transaction } : {}),
        }),
      );
      form.reset();
      toast.success("Your support request has been sent.");
      await requests.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">We’re here to help.</h1>
      <p className="mt-3 text-sm text-ink/55">
        Tell us what happened. Never share your password or verification code.
      </p>
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6"
        >
          <h2 className="font-bold">Send a request</h2>
          <Field
            id="subject"
            name="subject"
            label="What do you need help with?"
            minLength={5}
            maxLength={150}
            required
          />
          <div>
            <label
              htmlFor="message"
              className="mb-2 block text-sm font-semibold"
            >
              Tell us a little more
            </label>
            <textarea
              id="message"
              name="message"
              minLength={10}
              maxLength={3000}
              required
              rows={5}
              className={inputClass}
            />
          </div>
          {transaction && (
            <p className="break-all text-xs text-ink/50">
              Related payment: {transaction}
            </p>
          )}
          {error && <ErrorState message={error} />}
          <Button disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
        </form>
        <div>
          <h2 className="mb-5 font-bold">Your requests</h2>
          {requests.loading ? (
            <LoadingState />
          ) : requests.error ? (
            <ErrorState message={requests.error} />
          ) : !requests.data?.requests.length ? (
            <EmptyState title="No support requests yet." />
          ) : (
            <div className="space-y-4">
              {requests.data.requests.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl border border-ink/10 bg-white p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="font-bold">{r.subject}</h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-ink/60">
                    {r.message}
                  </p>
                  {r.response && (
                    <div className="mt-4 rounded-xl bg-paper p-4">
                      <p className="text-xs font-bold text-brand">
                        Quick Pay support
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {r.response}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
