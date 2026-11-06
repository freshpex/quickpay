import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import {
  categories,
  parseNaira,
  formatMoney,
  phone,
  type Service,
  type Beneficiary,
} from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { useSession } from "../../../providers/SessionProvider";
import { Screen } from "../../../components/layout/screen";
import { useValidatedForm } from "../../../lib/forms";
import { FormField } from "../../../components/ui/input/FormField";
import { Choice } from "../../../components/ui/choice/Choice";
import { Button } from "../../../components/ui/button";
import { Card, Row } from "../../../components/ui/card/Card";
import {
  Notice,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/feedback/Feedback";
import { PaymentReview } from "../../wallet/sheets/payment-review/PaymentReview";
import { operations } from "../../transactions/services/native-operation";
type Plan = { code: string; name: string; amount: string };
export function BillsScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    serviceId?: string;
    account?: string;
  }>();
  const category = categories.find((c) => c === params.category) || "airtime";
  const catalog = useResource<{ services: Service[] }>("/catalog"),
    saved = useResource<{ beneficiaries: Beneficiary[] }>("/beneficiaries");
  const { session } = useSession();
  const [service, setService] = useState<Service | null>(null),
    [selectedPlan, setSelectedPlan] = useState<Plan | null>(null),
    [type, setType] = useState("prepaid"),
    [review, setReview] = useState<{
      amount: string;
      recipient: string;
      validationId?: string;
      expires: number;
    } | null>(null);
  const plans = useResource<{ plans: Plan[] }>(
    `/catalog/${encodeURIComponent(service?.id || "")}/plans`,
    { enabled: !!service && service.category !== "airtime" },
  );
  const form = useValidatedForm(
    z.object({
      beneficiary: ["airtime", "data"].includes(category)
        ? phone
        : z.string().trim().min(3, "Enter the recipient’s details."),
      amount: z.string(),
      phone: ["airtime", "data"].includes(category)
        ? z.union([z.literal(""), phone])
        : phone,
    }),
    { beneficiary: params.account || "", amount: "", phone: "" },
  );
  const select = (s: Service) => {
    setService(s);
    setSelectedPlan(null);
    setReview(null);
    form.reset({
      beneficiary: params.serviceId === s.id ? params.account || "" : "",
      amount: "",
      phone: "",
    });
  };
  return (
    <Screen
      title={service ? service.name : `Pay ${category}.`}
      subtitle="Choose, check, then authorize."
      onRefresh={!service ? () => void catalog.refetch() : undefined}
      refreshing={catalog.isRefetching}
    >
      {!service ? (
        catalog.isPending ? (
          <LoadingState />
        ) : catalog.error ? (
          <ErrorState
            error={catalog.error}
            retry={() => void catalog.refetch()}
          />
        ) : (
          <>
            {catalog.data.services.filter((s) => s.category === category)
              .length === 0 && (
              <EmptyState
                title="No services available"
                body="Please check back for supported services."
              />
            )}
            {catalog.data.services
              .filter((s) => s.category === category)
              .map((s) => (
                <Choice
                  key={s.id}
                  label={s.name}
                  selected={false}
                  disabled={!s.available}
                  detail={
                    s.available
                      ? `Fee ${formatMoney(s.fee)}`
                      : s.reason || "Currently unavailable"
                  }
                  onPress={() => select(s)}
                />
              ))}
          </>
        )
      ) : (
        <>
          <Card>
            <Row
              label="Limits"
              value={`${formatMoney(service.min)} – ${formatMoney(service.max)}`}
            />
            <Row label="Fee" value={formatMoney(service.fee)} />
          </Card>
          {saved.data?.beneficiaries
            .filter((b) => b.details.serviceId === service.id)
            .map((b) => (
              <Choice
                key={b.id}
                label={b.name}
                detail={b.details.account}
                selected={form.watch("beneficiary") === b.details.account}
                onPress={() => {
                  form.setValue("beneficiary", b.details.account);
                  setReview(null);
                }}
              />
            ))}
          <FormField
            control={form.control}
            name="beneficiary"
            label={
              ["airtime", "data"].includes(category)
                ? "Phone number"
                : category === "electricity"
                  ? "Meter number"
                  : "Customer / account number"
            }
            keyboardType={
              ["airtime", "data"].includes(category) ? "phone-pad" : "default"
            }
          />
          {category === "electricity" && (
            <>
              <Choice
                label="Prepaid meter"
                selected={type === "prepaid"}
                onPress={() => setType("prepaid")}
              />
              <Choice
                label="Postpaid meter"
                selected={type === "postpaid"}
                onPress={() => setType("postpaid")}
              />
            </>
          )}
          {service.category !== "airtime" &&
            (plans.isPending ? (
              <LoadingState />
            ) : plans.error ? (
              <ErrorState
                error={plans.error}
                retry={() => void plans.refetch()}
              />
            ) : (
              plans.data.plans.map((p) => (
                <Choice
                  key={p.code}
                  label={p.name}
                  detail={formatMoney(p.amount)}
                  selected={selectedPlan?.code === p.code}
                  onPress={() => {
                    setSelectedPlan(p);
                    form.setValue("amount", "");
                  }}
                />
              ))
            ))}
          {!selectedPlan && (
            <FormField
              control={form.control}
              name="amount"
              label="Amount (NGN)"
              keyboardType="decimal-pad"
            />
          )}
          {!["airtime", "data"].includes(category) && (
            <FormField
              control={form.control}
              name="phone"
              label="Contact phone number"
              keyboardType="phone-pad"
            />
          )}
          {form.formState.errors.root?.message && (
            <Notice danger>{form.formState.errors.root.message}</Notice>
          )}
          <Button
            title="Check details and review"
            busy={form.formState.isSubmitting}
            onPress={() =>
              void form.submit(async (v) => {
                if (
                  ["data", "television", "education"].includes(category) &&
                  !selectedPlan
                )
                  throw new Error("Choose a plan before paying.");
                const amount = selectedPlan?.amount || parseNaira(v.amount);
                if (
                  BigInt(amount) < BigInt(service.min) ||
                  BigInt(amount) > BigInt(service.max) ||
                  BigInt(amount) % 100n !== 0n
                )
                  throw new Error(
                    "Choose a whole naira amount within the service limits.",
                  );
                if (["airtime", "data"].includes(category))
                  phone.parse(v.beneficiary);
                if (v.phone) phone.parse(v.phone);
                const validation = service.requiresValidation
                  ? await api<{ id: string; name: string }>(
                      "/billers/validate",
                      mutation({
                        serviceId: service.id,
                        beneficiary: v.beneficiary,
                        ...(category === "electricity" ? { type } : {}),
                      }),
                    )
                  : null;
                setReview({
                  amount,
                  recipient: validation?.name || v.beneficiary,
                  validationId: validation?.id,
                  expires: Date.now() + 9 * 60000,
                });
              })()
            }
          />
          <Button
            title="Choose another service"
            secondary
            onPress={() => setService(null)}
          />
          {review && (
            <PaymentReview
              open
              amount={review.amount}
              fee={service.fee}
              recipient={review.recipient}
              onClose={() => setReview(null)}
              onConfirm={async (pin) => {
                if (review.expires < Date.now())
                  throw new Error("Check the recipient again before paying.");
                const v = form.getValues();
                const t = await operations.submit(
                  session!.user.id,
                  "payment",
                  {
                    serviceId: service.id,
                    beneficiary: v.beneficiary,
                    amount: review.amount,
                    ...(selectedPlan ? { plan: selectedPlan.code } : {}),
                    ...(v.phone ? { phone: phone.parse(v.phone) } : {}),
                    ...(review.validationId
                      ? { validationId: review.validationId }
                      : {}),
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
