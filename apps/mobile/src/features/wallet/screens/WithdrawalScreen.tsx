import { useState } from "react";
import { router } from "expo-router";
import { z } from "zod";
import {
  parseNaira,
  formatMoney,
  type WalletCapabilities,
} from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { useSession } from "../../../providers/SessionProvider";
import { useValidatedForm } from "../../../lib/forms";
import { Screen } from "../../../components/layout/screen";
import { Input } from "../../../components/ui/input";
import { FormField } from "../../../components/ui/input/FormField";
import { Choice } from "../../../components/ui/choice/Choice";
import { Button } from "../../../components/ui/button";
import {
  Notice,
  LoadingState,
  ErrorState,
} from "../../../components/feedback/Feedback";
import { PaymentReview } from "../sheets/payment-review/PaymentReview";
import { operations } from "../../transactions/services/native-operation";
export function WithdrawalScreen() {
  const caps = useResource<WalletCapabilities>("/wallet/capabilities"),
    banks = useResource<{ banks: { code: string; name: string }[] }>("/banks", {
      enabled: caps.data?.withdrawal.available === true,
    });
  const { session } = useSession();
  const form = useValidatedForm(
    z.object({
      bankCode: z.string().min(3, "Choose your bank."),
      accountNumber: z
        .string()
        .regex(/^\d{10}$/, "Enter a ten-digit account number."),
      amount: z.string().min(1),
    }),
    { bankCode: "", accountNumber: "", amount: "" },
  );
  const [search, setSearch] = useState(""),
    [review, setReview] = useState<{
      id: string;
      name: string;
      amount: string;
      expires: number;
    } | null>(null);
  const bank = form.watch("bankCode");
  return (
    <Screen
      title="Straight to your bank."
      subtitle="Check your recipient before you authorize."
    >
      {caps.isPending ? (
        <LoadingState />
      ) : caps.error ? (
        <ErrorState error={caps.error} retry={() => void caps.refetch()} />
      ) : !caps.data.withdrawal.available ? (
        <Notice>{caps.data.withdrawal.reason}</Notice>
      ) : (
        <>
          <Notice>
            Limits {formatMoney(caps.data.withdrawal.minimum)} –{" "}
            {formatMoney(caps.data.withdrawal.maximum)}. Fee{" "}
            {formatMoney(caps.data.withdrawal.fee)}.
          </Notice>
          <Input
            label="Search Nigerian banks"
            value={search}
            onChangeText={setSearch}
          />
          {banks.isPending ? (
            <LoadingState />
          ) : banks.error ? (
            <ErrorState
              error={banks.error}
              retry={() => void banks.refetch()}
            />
          ) : (
            banks.data.banks
              .filter(
                (b) =>
                  b.code === bank ||
                  (search.trim().length > 0 &&
                    b.name.toLowerCase().includes(search.toLowerCase())),
              )
              .slice(0, 12)
              .map((b) => (
                <Choice
                  key={b.code}
                  label={b.name}
                  selected={bank === b.code}
                  onPress={() => {
                    form.setValue("bankCode", b.code);
                    setSearch("");
                    setReview(null);
                  }}
                />
              ))
          )}
          {!bank && <Notice>Type a bank name to choose your bank.</Notice>}
          <FormField
            control={form.control}
            name="accountNumber"
            label="Account number"
            keyboardType="number-pad"
            maxLength={10}
          />
          <FormField
            control={form.control}
            name="amount"
            label="Amount (NGN)"
            keyboardType="decimal-pad"
          />
          {form.formState.errors.root?.message && (
            <Notice danger>{form.formState.errors.root.message}</Notice>
          )}
          <Button
            title="Verify recipient and review"
            busy={form.formState.isSubmitting}
            onPress={() =>
              void form.submit(async (v) => {
                const amount = parseNaira(v.amount);
                if (
                  BigInt(amount) < BigInt(caps.data.withdrawal.minimum) ||
                  BigInt(amount) > BigInt(caps.data.withdrawal.maximum)
                )
                  throw new Error(
                    "Choose an amount within the withdrawal limits.",
                  );
                const result = await api<{ id: string; name: string }>(
                  "/banks/resolve",
                  mutation({
                    bankCode: v.bankCode,
                    accountNumber: v.accountNumber,
                  }),
                );
                setReview({
                  ...result,
                  amount,
                  expires: Date.now() + 9 * 60000,
                });
              })()
            }
          />
          {review && (
            <PaymentReview
              open
              amount={review.amount}
              fee={caps.data.withdrawal.fee}
              recipient={review.name}
              onClose={() => setReview(null)}
              onConfirm={async (pin) => {
                if (review.expires < Date.now())
                  throw new Error(
                    "Please verify this account again before withdrawing.",
                  );
                const t = await operations.submit(
                  session!.user.id,
                  "withdrawal",
                  {
                    amount: review.amount,
                    bankCode: form.getValues("bankCode"),
                    accountNumber: form.getValues("accountNumber"),
                    validationId: review.id,
                  },
                  pin,
                );
                form.reset();
                router.replace(`/(customer)/transactions/${t.id}`);
              }}
            />
          )}
        </>
      )}
    </Screen>
  );
}
