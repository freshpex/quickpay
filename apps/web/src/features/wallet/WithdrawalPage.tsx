"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, mutation } from "@quickpay/api-client";
import { formatMoney, parseNaira, type Transaction } from "@quickpay/contracts";
import { Field } from "../../components/ui/form-field";
import { PasswordInput, inputClass } from "../../components/ui/password-input";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/feedback";
import { useApi } from "../../lib/use-api";
export function WithdrawalPage() {
  const router = useRouter();
  const banks = useApi<{ banks: { name: string; code: string }[] }>("/banks");
  const [bankSearch, setBankSearch] = useState("");
  const [data, setData] = useState({
      amount: "",
      bankCode: "",
      accountNumber: "",
    }),
    [validation, setValidation] = useState<{ id: string; name: string }>(),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [key] = useState(() => crypto.randomUUID());
  const change = (name: string, value: string) => {
    setData((v) => ({ ...v, [name]: value }));
    setValidation(undefined);
    setReview(false);
  };
  async function check() {
    setBusy(true);
    setError("");
    try {
      const v = await api<{ id: string; name: string }>(
        "/banks/resolve",
        mutation({
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
        }),
      );
      parseNaira(data.amount);
      setValidation(v);
      setReview(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!review) {
      await check();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api<{ transaction: Transaction }>(
        "/withdrawals",
        mutation(
          {
            ...data,
            amount: parseNaira(data.amount),
            validationId: validation?.id,
            password: new FormData(e.currentTarget).get("password"),
          },
          key,
        ),
      );
      router.push(
        `/transactions/detail?id=${encodeURIComponent(r.transaction.id)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">
        Withdraw to your bank
      </h1>
      <p className="mb-8 mt-3 text-sm leading-relaxed text-ink/60">
        Check the account name before you confirm. Money is reserved while your
        transfer is being processed.
      </p>
      {banks.error && <ErrorState message={banks.error} />}
      <form
        onSubmit={submit}
        className="mt-5 space-y-6 rounded-2xl border border-ink/10 bg-white p-6"
      >
        <div>
          <label
            htmlFor="bankCode"
            className="mb-2 block text-sm font-semibold"
          >
            Bank
          </label>
          <Field
            id="bankSearch"
            label="Search banks"
            type="search"
            value={bankSearch}
            onChange={(e) => setBankSearch(e.target.value)}
            placeholder="Type a bank name"
          />
          <select
            id="bankCode"
            value={data.bankCode}
            onChange={(e) => change("bankCode", e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Choose a bank</option>
            {banks.data?.banks
              .filter(
                (b) =>
                  b.code === data.bankCode ||
                  b.name
                    .toLowerCase()
                    .includes(bankSearch.trim().toLowerCase()),
              )
              .map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>
        <Field
          label="Account number"
          id="accountNumber"
          value={data.accountNumber}
          onChange={(e) => change("accountNumber", e.target.value)}
          inputMode="numeric"
          pattern="[0-9]{10}"
          required
        />
        <Field
          label="Amount (₦)"
          id="amount"
          value={data.amount}
          onChange={(e) => change("amount", e.target.value)}
          inputMode="decimal"
          required
        />
        {review && validation && (
          <>
            <div className="rounded-xl bg-paper p-4 text-sm">
              <p className="font-bold">{validation.name}</p>
              <p className="mt-2 text-ink/60">
                Account ending {data.accountNumber.slice(-4)}
              </p>
              <dl className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <dt>Amount</dt>
                  <dd>{formatMoney(parseNaira(data.amount))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Fee</dt>
                  <dd>₦0.00</dd>
                </div>
                <div className="flex justify-between font-bold">
                  <dt>Total</dt>
                  <dd>{formatMoney(parseNaira(data.amount))}</dd>
                </div>
              </dl>
            </div>
            <PasswordInput
              label="Confirm with your password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </>
        )}
        {error && <ErrorState message={error} />}
        <Button disabled={busy || !banks.data?.banks.length} className="w-full">
          {busy
            ? "Please wait…"
            : review
              ? "Confirm withdrawal"
              : "Check account and review"}
        </Button>
      </form>
    </section>
  );
}
