import { useState } from "react";
import { router } from "expo-router";
import { z } from "zod";
import {
  parseNaira,
  depositSchema,
  type WalletCapabilities,
} from "@quickpay/contracts";
import { Screen } from "../../../components/layout/screen";
import { useResource } from "../../../services/api/use-resource";
import { useSession } from "../../../providers/SessionProvider";
import { useValidatedForm } from "../../../lib/forms";
import { FormField } from "../../../components/ui/input/FormField";
import { Button } from "../../../components/ui/button";
import {
  Notice,
  LoadingState,
  ErrorState,
} from "../../../components/feedback/Feedback";
import { PaymentReview } from "../sheets/payment-review/PaymentReview";
import { operations } from "../../transactions/services/native-operation";
export function DepositScreen() {
  const { session } = useSession();
  const caps = useResource<WalletCapabilities>("/wallet/capabilities");
  const form = useValidatedForm(
    z.object({ amount: z.string().min(1, "Enter an amount.") }),
    { amount: "" },
  );
  const [amount, setAmount] = useState<string | null>(null);
  return (
    <Screen
      title="A little more possibility."
      subtitle="Add money to your Quick Pay wallet."
    >
      {caps.isPending ? (
        <LoadingState />
      ) : caps.error ? (
        <ErrorState error={caps.error} retry={() => void caps.refetch()} />
      ) : !caps.data.deposit.available ? (
        <Notice>{caps.data.deposit.reason}</Notice>
      ) : (
        <>
          <Notice>
            {caps.data.deposit.methods?.map((m) => m.name).join(", ")}. Your
            wallet updates after your payment is confirmed.
          </Notice>
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
            title="Review deposit"
            busy={form.formState.isSubmitting}
            onPress={() =>
              void form.submit(async (v) => {
                const value = parseNaira(v.amount);
                depositSchema.parse({ amount: value });
                if (
                  BigInt(value) < BigInt(caps.data.deposit.minimum) ||
                  BigInt(value) > BigInt(caps.data.deposit.maximum)
                )
                  throw new Error("Choose an amount within the wallet limits.");
                setAmount(value);
              })()
            }
          />
          {amount && (
            <PaymentReview
              open
              onClose={() => setAmount(null)}
              amount={amount}
              fee={caps.data.deposit.fee}
              recipient="Your Quick Pay wallet"
              authorize={false}
              onConfirm={async () => {
                const t = await operations.submit(session!.user.id, "deposit", {
                  amount,
                });
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
