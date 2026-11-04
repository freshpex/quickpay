"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api, mutation } from "@quickpay/api-client";
import type { Service } from "@quickpay/contracts";
import { useApi } from "../../lib/use-api";
import { Field } from "../../components/ui/form-field";
import { inputClass } from "../../components/ui/password-input";
import { Button } from "../../components/ui/button";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../components/feedback";
export function BeneficiariesPage() {
  const r = useApi<{
    beneficiaries: {
      id: string;
      name: string;
      kind: string;
      details: { account: string; serviceId?: string };
    }[];
  }>("/beneficiaries");
  const catalog = useApi<{ services: Service[] }>("/catalog");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      v = Object.fromEntries(new FormData(form));
    setBusy(true);
    try {
      await api(
        "/beneficiaries",
        mutation({
          name: v.name,
          kind: v.kind,
          details: {
            account: v.account,
            ...(v.serviceId ? { serviceId: v.serviceId } : {}),
          },
        }),
      );
      form.reset();
      toast.success("Beneficiary saved.");
      await r.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      await api("/beneficiaries", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      await r.refresh();
      toast.success("Beneficiary removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    }
  }
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Saved beneficiaries</h1>
      <p className="mb-8 mt-3 text-sm text-ink/55">
        Keep the people and accounts you pay close by.
      </p>
      <div className="grid gap-8 xl:grid-cols-2">
        <form
          onSubmit={save}
          className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6"
        >
          <Field
            id="beneficiary-name"
            name="name"
            label="Name"
            required
            minLength={2}
          />
          <div>
            <label htmlFor="kind" className="mb-2 block text-sm font-semibold">
              Type
            </label>
            <select id="kind" name="kind" className={inputClass}>
              <option value="phone">Phone number</option>
              <option value="bill">Bill account</option>
            </select>
          </div>
          <Field
            id="account"
            name="account"
            label="Phone or account number"
            required
          />
          <div>
            <label
              htmlFor="serviceId"
              className="mb-2 block text-sm font-semibold"
            >
              Service (optional)
            </label>
            <select id="serviceId" name="serviceId" className={inputClass}>
              <option value="">Choose a service</option>
              {catalog.data?.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button disabled={busy}>Save beneficiary</Button>
        </form>
        <div>
          {r.loading ? (
            <LoadingState />
          ) : r.error ? (
            <ErrorState message={r.error} />
          ) : !r.data?.beneficiaries.length ? (
            <EmptyState title="No saved beneficiaries yet." />
          ) : (
            <div className="space-y-3">
              {r.data.beneficiaries.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-5"
                >
                  <div>
                    <h2 className="font-bold">{b.name}</h2>
                    <p className="mt-1 break-all text-sm text-ink/50">
                      {b.details.account}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(b.id)}
                    aria-label={`Remove ${b.name}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
