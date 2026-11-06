"use client";
import { TransactionPinField } from "../security/TransactionPinField";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  Wifi,
  Lightbulb,
  Tv,
  GraduationCap,
  ArrowLeft,
  Check,
} from "lucide-react";
import { api, mutation } from "@quickpay/api-client";
import {
  categories,
  phone,
  parseNaira,
  formatMoney,
  type Service,
  type Transaction,
} from "@quickpay/contracts";
import { useApi } from "../../lib/use-api";
import { Field } from "../../components/ui/form-field";
import { inputClass } from "../../components/ui/password-input";
import { Button } from "../../components/ui/button";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../components/feedback";
const icons = {
  airtime: Phone,
  data: Wifi,
  electricity: Lightbulb,
  television: Tv,
  internet: Wifi,
  education: GraduationCap,
  other: Lightbulb,
};
export function BillsPage({
  initialCategory,
}: {
  initialCategory?: (typeof categories)[number];
}) {
  const router = useRouter();
  const catalog = useApi<{ services: Service[] }>("/catalog");
  const saved = useApi<{
    beneficiaries: {
      id: string;
      name: string;
      kind: string;
      details: { account: string; serviceId?: string };
    }[];
  }>("/beneficiaries");
  const [category, setCategory] = useState<string>(
      initialCategory || "airtime",
    ),
    [service, setService] = useState<Service>(),
    [step, setStep] = useState(0),
    [plans, setPlans] = useState<
      { code: string; name: string; amount: string }[]
    >([]),
    [data, setData] = useState({
      beneficiary: "",
      amount: "",
      plan: "",
      phone: "",
      type: "prepaid",
    }),
    [validation, setValidation] = useState<{ id: string; name: string }>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pinReady, setPinReady] = useState(false),
    [key, setKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (!initialCategory) {
      const q = new URLSearchParams(window.location.search).get("category");
      if (q && categories.includes(q as (typeof categories)[number]))
        setCategory(q);
    }
  }, [initialCategory]);
  async function select(s: Service) {
    setService(s);
    setStep(1);
    setError("");
    setPlans([]);
    setData({
      beneficiary: "",
      amount: "",
      plan: "",
      phone: "",
      type: "prepaid",
    });
    setValidation(undefined);
    setKey(crypto.randomUUID());
    if (s.category !== "airtime") {
      setBusy(true);
      try {
        setPlans(
          (
            await api<{
              plans: { code: string; name: string; amount: string }[];
            }>(`/catalog/${s.id}/plans`)
          ).plans,
        );
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "We could not load the plans.",
        );
      } finally {
        setBusy(false);
      }
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!service) return;
    setError("");
    setBusy(true);
    try {
      if (["airtime", "data"].includes(service.category)) {
        const parsed = phone.safeParse(data.beneficiary);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      }
      if (data.phone) {
        const parsed = phone.safeParse(data.phone);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      }
      if (step === 1) {
        parseNaira(data.amount);
        if (service.requiresValidation) {
          setValidation(
            await api(
              "/billers/validate",
              mutation({
                serviceId: service.id,
                beneficiary: data.beneficiary,
                ...(service.category === "electricity"
                  ? { type: data.type }
                  : {}),
              }),
            ),
          );
        }
        setStep(2);
      } else {
        const r = await api<{ transaction: Transaction }>(
          "/payments",
          mutation(
            {
              serviceId: service.id,
              beneficiary: data.beneficiary,
              amount: parseNaira(data.amount),
              ...(data.plan ? { plan: data.plan } : {}),
              ...(data.phone ? { phone: data.phone } : {}),
              validationId: validation?.id,
              pin: new FormData(e.currentTarget).get("pin"),
            },
            key,
          ),
        );
        router.push(
          `/transactions/detail?id=${encodeURIComponent(r.transaction.id)}`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const back = () => {
    setStep((v) => v - 1);
    setError("");
    setValidation(undefined);
  };
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">
        {initialCategory === "airtime"
          ? "Buy airtime"
          : initialCategory === "data"
            ? "Buy data"
            : "Pay a bill"}
      </h1>
      <p className="mt-3 text-sm text-ink/55">
        A few details. A clear total. One less thing to do.
      </p>
      <ol
        aria-label="Payment progress"
        className="my-8 flex flex-wrap gap-4 text-xs"
      >
        {["Choose a service", "Enter details", "Review & pay"].map(
          (label, i) => (
            <li
              key={label}
              aria-current={step === i ? "step" : undefined}
              className={`flex items-center gap-2 ${step === i ? "font-bold text-brand" : "text-ink/40"}`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full ${step >= i ? "bg-brand text-white" : "bg-ink/5"}`}
              >
                {step > i ? <Check size={12} /> : i + 1}
              </span>
              {label}
            </li>
          ),
        )}
      </ol>
      {step === 0 ? (
        <>
          {!initialCategory && (
            <div
              className="mb-7 flex flex-wrap gap-2"
              aria-label="Bill categories"
            >
              {categories.map((c) => {
                const Icon = icons[c];
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-semibold capitalize ${category === c ? "border-brand bg-brand text-white" : "border-ink/10 bg-white"}`}
                  >
                    <Icon size={16} />
                    {c}
                  </button>
                );
              })}
            </div>
          )}
          {catalog.loading ? (
            <LoadingState />
          ) : catalog.error ? (
            <ErrorState message={catalog.error} retry={catalog.refresh} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {catalog.data?.services
                .filter((s) => s.category === category)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => select(s)}
                    disabled={!s.available}
                    className="min-h-36 rounded-2xl border border-ink/10 bg-white p-5 text-left transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      {s.logo ? (
                        <img
                          src={s.logo}
                          alt=""
                          className="size-9 object-contain"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-xl bg-brand/5 text-brand">
                          {(() => {
                            const Icon = icons[s.category];
                            return <Icon size={23} />;
                          })()}
                        </span>
                      )}
                      <h2 className="font-bold">{s.name}</h2>
                    </div>
                    <p
                      className={`text-xs ${s.available ? "text-green-700" : "text-ink/50"}`}
                    >
                      {s.available
                        ? "Available"
                        : s.reason || "Not available yet"}
                    </p>
                    <p className="mt-2 text-xs text-ink/45">
                      Fee: {formatMoney(s.fee)}
                    </p>
                  </button>
                ))}
              {catalog.data?.services.filter((s) => s.category === category)
                .length === 0 && (
                <EmptyState
                  title="More services are on the way."
                  description="Available providers will appear here."
                />
              )}
            </div>
          )}
        </>
      ) : (
        <div className="max-w-xl">
          <button
            onClick={back}
            className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand"
          >
            <ArrowLeft size={17} />
            Back
          </button>
          <form
            onSubmit={submit}
            className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6"
          >
            <h2 className="text-xl font-bold">{service?.name}</h2>
            {step === 1 ? (
              <>
                {!!saved.data?.beneficiaries?.length && (
                  <div>
                    <label
                      htmlFor="saved-recipient"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Saved beneficiary (optional)
                    </label>
                    <select
                      id="saved-recipient"
                      className={inputClass}
                      defaultValue=""
                      onChange={(e) => {
                        const item = saved.data?.beneficiaries.find(
                          (b) => b.id === e.target.value,
                        );
                        if (item)
                          setData((v) => ({
                            ...v,
                            beneficiary: item.details.account,
                          }));
                      }}
                    >
                      <option value="">Choose a saved beneficiary</option>
                      {saved.data.beneficiaries
                        .filter(
                          (b) =>
                            !b.details.serviceId ||
                            b.details.serviceId === service?.id,
                        )
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} · {b.details.account}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <Field
                  label={
                    ["airtime", "data"].includes(category)
                      ? "Nigerian phone number"
                      : category === "electricity"
                        ? "Meter number"
                        : category === "television"
                          ? "Smartcard number"
                          : "Account or phone number"
                  }
                  type={
                    ["airtime", "data"].includes(service?.category || "")
                      ? "tel"
                      : "text"
                  }
                  id="beneficiary"
                  value={data.beneficiary}
                  onChange={(e) =>
                    setData((v) => ({ ...v, beneficiary: e.target.value }))
                  }
                  inputMode="numeric"
                  required
                />
                {category === "electricity" && (
                  <div>
                    <label
                      htmlFor="meter-type"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Meter type
                    </label>
                    <select
                      id="meter-type"
                      className={inputClass}
                      value={data.type}
                      onChange={(e) =>
                        setData((v) => ({ ...v, type: e.target.value }))
                      }
                    >
                      <option value="prepaid">Prepaid</option>
                      <option value="postpaid">Postpaid</option>
                    </select>
                  </div>
                )}
                {plans.length > 0 && (
                  <div>
                    <label
                      htmlFor="plan"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Choose a plan
                    </label>
                    <select
                      id="plan"
                      className={inputClass}
                      required
                      value={data.plan}
                      onChange={(e) => {
                        const p = plans.find((p) => p.code === e.target.value);
                        setData((v) => ({
                          ...v,
                          plan: p?.code || "",
                          amount: p
                            ? `${BigInt(p.amount) / 100n}.${(BigInt(p.amount) % 100n).toString().padStart(2, "0")}`
                            : "",
                        }));
                      }}
                    >
                      <option value="">Select a plan</option>
                      {plans.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name} · {formatMoney(p.amount)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Field
                  label="Amount (₦)"
                  id="amount"
                  value={data.amount}
                  onChange={(e) =>
                    setData((v) => ({ ...v, amount: e.target.value }))
                  }
                  inputMode="decimal"
                  readOnly={!!data.plan}
                  required
                />
                {!["airtime", "data"].includes(category) && (
                  <Field
                    label="Nigerian contact phone"
                    id="phone"
                    value={data.phone}
                    onChange={(e) =>
                      setData((v) => ({ ...v, phone: e.target.value }))
                    }
                    type="tel"
                    required
                  />
                )}
              </>
            ) : (
              <>
                <div className="space-y-3 rounded-xl bg-paper p-5 text-sm">
                  {[
                    ["Recipient", validation?.name || data.beneficiary],
                    ["Account", data.beneficiary],
                    ["Amount", formatMoney(parseNaira(data.amount))],
                    ["Fee", formatMoney(service?.fee || "0")],
                    [
                      "Total",
                      formatMoney(
                        BigInt(parseNaira(data.amount)) +
                          BigInt(service?.fee || "0"),
                      ),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-wrap justify-between gap-2"
                    >
                      <span className="text-ink/55">{label}</span>
                      <span className="break-all font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
                <TransactionPinField onReady={setPinReady} />
                <p className="text-xs leading-relaxed text-ink/50">
                  Check the recipient carefully. Once confirmed, your payment
                  may not be refundable.
                </p>
              </>
            )}
            {error && <ErrorState message={error} />}
            <Button
              disabled={busy || (step !== 1 && !pinReady)}
              className="w-full"
            >
              {busy
                ? "Please wait…"
                : step === 1
                  ? "Review payment"
                  : "Confirm and pay"}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
