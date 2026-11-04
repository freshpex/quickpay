"use client";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Settings2 } from "lucide-react";
import { api } from "@quickpay/api-client";
import { useApi } from "../../../../lib/use-api";
import { Field } from "../../../../components/ui/form-field";
import { inputClass } from "../../../../components/ui/password-input";
import { Button } from "../../../../components/ui/button";
import { Modal } from "../../../../components/ui/dialog";
import { StatusBadge } from "../../../../components/ui/status-badge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../components/feedback";
import { adminSections } from "../../components/AdminShell";
type Row = Record<string, unknown>;
const editable = [
  "transactions",
  "users",
  "catalog",
  "gift-products",
  "gifts",
  "support",
  "operations",
];
const visible: Record<string, string[]> = {
  users: [
    "name",
    "email",
    "email_verified",
    "phone_verified",
    "role",
    "created_at",
  ],
  transactions: [
    "kind",
    "amount",
    "fee",
    "currency",
    "status",
    "reference",
    "createdAt",
  ],
  catalog: ["name", "category", "enabled", "fee", "min", "max"],
  gifts: [
    "brand",
    "region",
    "units",
    "amount",
    "status",
    "evidence_status",
    "reason",
  ],
  "gift-products": [
    "brand",
    "region",
    "card_type",
    "enabled",
    "sell_enabled",
    "rate_kobo",
    "version",
  ],
  support: ["subject", "message", "status", "response"],
  operations: ["type", "status", "attempts", "last_error", "created_at"],
  audit: [
    "actor_id",
    "action",
    "resource",
    "before_value",
    "after_value",
    "created_at",
  ],
  exchanges: [
    "source",
    "target",
    "enabled",
    "provider",
    "quote_rules",
    "settlement_rules",
  ],
};
export function AdminResourcePage({ resource }: { resource: string }) {
  const r = useApi<{ items: Row[] }>(`/admin/${resource}`);
  const [selected, setSelected] = useState<Row>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const title =
    adminSections.find(([slug]) => slug === resource)?.[1] || resource;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data: Row = { ...Object.fromEntries(form), id: selected?.id };
    for (const field of ["enabled", "sellEnabled", "referralHold"])
      if (form.has(`${field}-present`)) data[field] = form.get(field) === "on";
    delete data["referralHold-present"];
    delete data["enabled-present"];
    delete data["sellEnabled-present"];
    try {
      await api(`/admin/${resource}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      toast.success("Changes saved and recorded in the audit history.");
      setSelected(undefined);
      await r.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <button
          onClick={r.refresh}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink/15 px-4 text-xs font-bold"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <p className="mb-8 mt-3 text-sm text-ink/55">
        Server permissions and two-step verification are required. Changes are
        audited.
      </p>
      {r.loading ? (
        <LoadingState />
      ) : r.error ? (
        <ErrorState message={r.error} retry={r.refresh} />
      ) : !r.data?.items.length ? (
        <EmptyState
          title={`No ${title.toLowerCase()} to show.`}
          description={
            resource === "exchanges"
              ? "No provider-supported currency pairs are configured."
              : "New records will appear here."
          }
        />
      ) : (
        <div className="space-y-4">
          {r.data.items.map((row, i) => (
            <article
              key={String(row.id || i)}
              className="rounded-2xl border border-ink/10 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <p className="max-w-full break-all font-mono text-[10px] text-ink/40">
                  {String(row.id)}
                </p>
                {editable.includes(resource) && (
                  <button
                    onClick={() => {
                      setSelected(row);
                      setError("");
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand/5 px-4 text-xs font-bold text-brand"
                  >
                    <Settings2 size={15} />
                    {resource === "transactions"
                      ? "Reconcile"
                      : resource === "gifts"
                        ? "Review"
                        : resource === "support"
                          ? "Reply"
                          : resource === "operations"
                            ? "Retry"
                            : "Edit settings"}
                  </button>
                )}
              </div>
              <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                {(visible[resource] || Object.keys(row))
                  .filter((k) => row[k] !== undefined && row[k] !== null)
                  .map((k) => (
                    <div key={k} className="min-w-0">
                      <dt className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                        {k.replaceAll("_", " ")}
                      </dt>
                      <dd className="break-words text-sm">
                        {k === "status" ? (
                          <StatusBadge status={String(row[k])} />
                        ) : typeof row[k] === "boolean" ? (
                          row[k] ? (
                            "Yes"
                          ) : (
                            "No"
                          )
                        ) : typeof row[k] === "object" ? (
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-paper p-3 text-[10px]">
                            {JSON.stringify(row[k], null, 2)}
                          </pre>
                        ) : (
                          String(row[k])
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
            </article>
          ))}
        </div>
      )}
      <Modal
        title={
          resource === "gifts"
            ? "Review gift-card sale"
            : `Update ${title.toLowerCase()}`
        }
        description="Complete the checks and record the reason. Saving applies this change immediately."
        open={!!selected}
        onClose={() => setSelected(undefined)}
      >
        {selected && (
          <form onSubmit={save} className="space-y-5">
            {resource === "users" && (
              <Toggle
                name="referralHold"
                label="Hold referral rewards for suspicious activity"
                value={!!selected.referral_hold}
              />
            )}{" "}
            {resource === "catalog" && (
              <>
                {[
                  ["fee", "Fee (kobo)"],
                  ["min", "Minimum (kobo)"],
                  ["max", "Maximum (kobo)"],
                ].map(([name, label]) => (
                  <Field
                    key={name}
                    id={`edit-${name}`}
                    name={name}
                    label={label}
                    defaultValue={String(selected[name])}
                    inputMode="numeric"
                    required
                  />
                ))}
                <Toggle
                  name="enabled"
                  label="Service enabled"
                  value={!!selected.enabled}
                />
              </>
            )}
            {resource === "gift-products" && (
              <>
                <Field
                  id="rateKobo"
                  name="rateKobo"
                  label="Naira rate per whole card unit (kobo)"
                  defaultValue={String(selected.rate_kobo)}
                  required
                />
                {[
                  ["minUnits", "min_units", "Minimum card value"],
                  ["maxUnits", "max_units", "Maximum card value"],
                ].map(([name, key, label]) => (
                  <Field
                    key={name}
                    id={name}
                    name={name}
                    label={label}
                    defaultValue={String(selected[key])}
                    required
                  />
                ))}
                <Toggle
                  name="enabled"
                  label="Product enabled"
                  value={!!selected.enabled}
                />
                <Toggle
                  name="sellEnabled"
                  label="Sales accepted"
                  value={!!selected.sell_enabled}
                />
              </>
            )}
            {resource === "gifts" && (
              <>
                <p className="text-sm leading-relaxed text-ink/60">
                  Evidence remains quarantined until a safety scan is completed.
                  Approve only after checking ownership, region, authenticity
                  and usable value. A separate administrator settles an approved
                  sale.
                </p>
                {selected.evidence_status === "clean" && (
                  <a
                    href={`/api/v1/gift-cards/evidence/${selected.evidence_id}`}
                    target="_blank"
                    className="inline-flex min-h-11 items-center text-sm font-bold text-brand"
                  >
                    Download private evidence
                  </a>
                )}
                <div>
                  <label
                    htmlFor="review-action"
                    className="mb-2 block text-sm font-bold"
                  >
                    Action
                  </label>
                  <select
                    id="review-action"
                    name="action"
                    className={inputClass}
                  >
                    <option value="clean">
                      Confirm external safety scan complete
                    </option>
                    <option value="approve">Approve verified card value</option>
                    <option value="reject">Reject with reason</option>
                    <option value="settle">
                      Confirm settlement (separate administrator)
                    </option>
                  </select>
                </div>
                <Field
                  id="settlementReference"
                  name="settlementReference"
                  label="Settlement verification reference (required to settle)"
                />
              </>
            )}
            {resource === "support" && (
              <>
                <Field
                  id="response"
                  name="response"
                  label="Reply to the customer"
                  required
                  minLength={5}
                />
                <div>
                  <label
                    htmlFor="support-status"
                    className="mb-2 block text-sm font-bold"
                  >
                    Status
                  </label>
                  <select
                    id="support-status"
                    name="status"
                    className={inputClass}
                  >
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </>
            )}
            {resource !== "support" && (
              <Field
                id="reason"
                name="reason"
                label="Reason and verification evidence"
                required
                minLength={10}
              />
            )}{" "}
            {error && <ErrorState message={error} />}
            <Button disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </form>
        )}
      </Modal>
    </section>
  );
}
function Toggle({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: boolean;
}) {
  return (
    <>
      <input type="hidden" name={`${name}-present`} value="true" />
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name={name}
          defaultChecked={value}
          className="size-5 accent-brand"
        />
        {label}
      </label>
    </>
  );
}
