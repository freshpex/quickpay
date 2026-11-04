"use client";
import { useState } from "react";
import { toast } from "sonner";
import { api, mutation } from "@quickpay/api-client";
import {
  rewardRuleSchema,
  ruleSummary,
  calculateReward,
  parseNaira,
  formatMoney,
  categories,
  type RewardRule,
} from "@quickpay/contracts";
import { useApi } from "../../../../lib/use-api";
import { Field } from "../../../../components/ui/form-field";
import { inputClass } from "../../../../components/ui/password-input";
import { Button } from "../../../../components/ui/button";
import { ErrorState, LoadingState } from "../../../../components/feedback";
const defaults: RewardRule = {
  name: "New referral campaign",
  enabled: false,
  type: "percentage",
  value: "100",
  recipient: "referrer",
  categories: ["airtime", "data"],
  serviceIds: [],
  frequency: "first",
  minimum: "100000",
  base: "payment",
  maximum: "50000",
  userCap: "500000",
  campaignCap: "10000000",
  startsAt: new Date().toISOString(),
  endsAt: null,
  holdingHours: 24,
  claimable: true,
  withdrawable: true,
  effectiveAt: new Date().toISOString(),
};
export function RewardRulesPage() {
  const history = useApi<{
    rules: {
      id: string;
      version: number;
      rule: RewardRule;
      created_at: string;
    }[];
  }>("/admin/reward-rules");
  const [rule, setRule] = useState(defaults),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [immediate, setImmediate] = useState(true),
    [sample, setSample] = useState("5000"),
    [revenue, setRevenue] = useState("100");
  const update = <K extends keyof RewardRule>(key: K, value: RewardRule[K]) =>
    setRule((r) => ({ ...r, [key]: value }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = rewardRuleSchema.safeParse(rule);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" "),
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(
        "/admin/reward-rules",
        mutation({
          ...parsed.data,
          effectiveAt: immediate
            ? new Date().toISOString()
            : parsed.data.effectiveAt,
        }),
      );
      toast.success("A new rule version has been saved.");
      await history.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (history.loading) return <LoadingState />;
  if (history.error) return <ErrorState message={history.error} />;
  const parsed = rewardRuleSchema.safeParse(rule);
  let preview = "Enter valid sample amounts.";
  try {
    if (parsed.success)
      preview = formatMoney(
        calculateReward(
          parsed.data,
          BigInt(parseNaira(sample)),
          BigInt(parseNaira(revenue)),
        ),
      );
  } catch {
    /* Invalid sample amounts keep the explanatory preview. */
  }
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">
        Referral & reward rules
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/55">
        Save a new immutable version. Each reward keeps its original rule.
        Percentages use basis points: 100 = 1%.
      </p>
      <div className="mt-8 grid gap-7 xl:grid-cols-[1.4fr_1fr]">
        <form
          onSubmit={save}
          className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6"
        >
          <Field
            id="rule-name"
            label="Campaign name"
            value={rule.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                ["type", "Reward type", ["percentage", "fixed"]],
                [
                  "recipient",
                  "Who receives it?",
                  ["referrer", "referred", "both"],
                ],
                ["frequency", "Qualifying payments", ["first", "recurring"]],
                ["base", "Calculation base", ["payment", "revenue"]],
              ] as const
            ).map(([key, label, values]) => (
              <div key={key}>
                <label htmlFor={key} className="mb-2 block text-sm font-bold">
                  {label}
                </label>
                <select
                  id={key}
                  value={rule[key]}
                  onChange={(e) => update(key, e.target.value as never)}
                  className={inputClass}
                >
                  {values.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <Field
            id="value"
            label={
              rule.type === "percentage"
                ? "Reward in basis points"
                : "Reward in kobo"
            }
            value={rule.value}
            onChange={(e) => update("value", e.target.value)}
            inputMode="numeric"
            required
          />
          <fieldset>
            <legend className="mb-3 text-sm font-bold">
              Eligible bill categories
            </legend>
            <div className="flex flex-wrap gap-3">
              {categories.map((c) => (
                <label
                  key={c}
                  className="flex min-h-11 items-center gap-2 text-xs capitalize"
                >
                  <input
                    type="checkbox"
                    checked={rule.categories.includes(c)}
                    onChange={(e) =>
                      update(
                        "categories",
                        e.target.checked
                          ? [...rule.categories, c]
                          : rule.categories.filter((v) => v !== c),
                      )
                    }
                    className="size-5 accent-brand"
                  />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            id="services"
            label="Service IDs, comma separated (blank = all in selected categories)"
            value={rule.serviceIds.join(",")}
            onChange={(e) =>
              update(
                "serviceIds",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                ["minimum", "Minimum payment (kobo)"],
                ["maximum", "Maximum total per transaction (kobo)"],
                ["userCap", "Per-user campaign cap (kobo)"],
                ["campaignCap", "Campaign cap (kobo)"],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                id={key}
                label={label}
                value={rule[key]}
                onChange={(e) => update(key, e.target.value)}
                inputMode="numeric"
                required
              />
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              type="datetime-local"
              id="startsAt"
              label="Start (Africa/Lagos)"
              value={new Date(rule.startsAt)
                .toLocaleString("sv-SE", { timeZone: "Africa/Lagos" })
                .replace(" ", "T")
                .slice(0, 16)}
              onChange={(e) =>
                update(
                  "startsAt",
                  new Date(`${e.target.value}:00+01:00`).toISOString(),
                )
              }
              required
            />
            <Field
              type="datetime-local"
              id="endsAt"
              label="End (optional, Africa/Lagos)"
              value={
                rule.endsAt
                  ? new Date(rule.endsAt)
                      .toLocaleString("sv-SE", { timeZone: "Africa/Lagos" })
                      .replace(" ", "T")
                      .slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                update(
                  "endsAt",
                  e.target.value
                    ? new Date(`${e.target.value}:00+01:00`).toISOString()
                    : null,
                )
              }
            />
          </div>
          <Field
            id="holdingHours"
            label="Holding period (hours)"
            type="number"
            min={0}
            max={2160}
            value={rule.holdingHours}
            onChange={(e) => update("holdingHours", Number(e.target.value))}
          />
          {(
            [
              ["enabled", "Campaign enabled"],
              ["claimable", "Rewards can be claimed"],
              [
                "withdrawable",
                "Rewards can be moved to withdrawable wallet funds",
              ],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-11 items-center gap-3 text-sm"
            >
              <input
                type="checkbox"
                checked={rule[key]}
                onChange={(e) => update(key, e.target.checked)}
                className="size-5 accent-brand"
              />
              {label}
            </label>
          ))}
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={immediate}
              onChange={(e) => setImmediate(e.target.checked)}
              className="size-5 accent-brand"
            />
            Apply when saved
          </label>
          {!immediate && (
            <Field
              type="datetime-local"
              id="effectiveAt"
              label="Effective from (Africa/Lagos)"
              value={new Date(rule.effectiveAt)
                .toLocaleString("sv-SE", { timeZone: "Africa/Lagos" })
                .replace(" ", "T")
                .slice(0, 16)}
              onChange={(e) =>
                update(
                  "effectiveAt",
                  new Date(`${e.target.value}:00+01:00`).toISOString(),
                )
              }
              required
            />
          )}
          <p className="text-xs text-ink/50">
            Historic rewards keep their original rule version.
          </p>
          {error && <ErrorState message={error} />}
          <Button disabled={busy}>
            {busy ? "Saving…" : "Save new rule version"}
          </Button>
        </form>
        <div className="space-y-6">
          <section className="rounded-2xl bg-deep p-6 text-white">
            <h2 className="font-bold">Rule preview</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              {parsed.success
                ? ruleSummary(parsed.data)
                : "Complete the rule to see a summary."}
            </p>
            <div className="mt-6 space-y-4 text-ink [&_label]:text-white">
              <Field
                id="sample"
                label="Sample payment (₦)"
                value={sample}
                onChange={(e) => setSample(e.target.value)}
              />
              <Field
                id="revenue"
                label="Sample platform revenue (₦)"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
            <p className="mt-5 text-xs text-white/60">
              Calculated reward before remaining caps
            </p>
            <p className="mt-2 text-3xl font-bold text-lime">{preview}</p>
          </section>
          <section>
            <h2 className="mb-4 font-bold">Version history</h2>
            <div className="space-y-3">
              {history.data?.rules.map((r) => (
                <button
                  key={r.id}
                  onClick={() =>
                    setRule({
                      ...r.rule,
                      effectiveAt: new Date().toISOString(),
                    })
                  }
                  className="w-full rounded-xl border border-ink/10 bg-white p-4 text-left"
                >
                  <span className="text-xs font-bold text-brand">
                    Version {r.version} ·{" "}
                    {r.rule.enabled ? "enabled" : "disabled"}
                  </span>
                  <span className="mt-2 block text-sm font-bold">
                    {r.rule.name}
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-ink/50">
                    {ruleSummary(r.rule)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
