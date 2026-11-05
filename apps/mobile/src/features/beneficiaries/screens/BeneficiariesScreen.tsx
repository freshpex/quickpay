import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { phone, type Beneficiary, type Service } from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { useValidatedForm } from "../../../lib/forms";
import { Screen } from "../../../components/layout/screen";
import { FormField } from "../../../components/ui/input/FormField";
import { Choice } from "../../../components/ui/choice/Choice";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card/Card";
import {
  Notice,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/feedback/Feedback";
export function BeneficiariesScreen() {
  const params = useLocalSearchParams<{
    serviceId?: string;
    account?: string;
  }>();
  const list = useResource<{ beneficiaries: Beneficiary[] }>("/beneficiaries"),
    catalog = useResource<{ services: Service[] }>("/catalog");
  const form = useValidatedForm(
    z.object({
      name: z.string().trim().min(2).max(80),
      account: z.string().trim().min(3).max(100),
      serviceId: z.string().min(1, "Choose a service."),
    }),
    {
      name: "",
      account: params.account || "",
      serviceId: params.serviceId || "",
    },
  );
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  return (
    <Screen
      title="Your regulars."
      subtitle="Saved details. Fresh checks before every payment."
      onRefresh={() => void list.refetch()}
      refreshing={list.isRefetching}
    >
      {list.isPending ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : !list.data.beneficiaries.length ? (
        <EmptyState
          title="No saved recipients yet"
          body="Save a phone or bill account below."
        />
      ) : (
        list.data.beneficiaries.map((b) => (
          <Card key={b.id}>
            <Choice
              label={b.name}
              detail={b.details.account}
              selected={false}
              onPress={() => {
                const service = catalog.data?.services.find(
                  (s) => s.id === b.details.serviceId,
                );
                if (service)
                  router.push({
                    pathname: "/(customer)/bills",
                    params: {
                      category: service.category,
                      serviceId: service.id,
                      account: b.details.account,
                    },
                  });
                else
                  setMessage(
                    "This recipient’s service is currently unavailable.",
                  );
              }}
            />
            <Button
              title="Remove recipient"
              secondary
              busy={busy === b.id}
              onPress={() => {
                setBusy(b.id);
                void api("/beneficiaries", {
                  ...mutation({ id: b.id }),
                  method: "DELETE",
                })
                  .then(() => list.refetch())
                  .catch((e) => setMessage(e.message))
                  .finally(() => setBusy(null));
              }}
            />
          </Card>
        ))
      )}
      <Card>
        <FormField
          control={form.control}
          name="name"
          label="Recipient name"
          autoCapitalize="words"
        />
        <FormField
          control={form.control}
          name="account"
          label="Phone / customer number"
        />
        {catalog.data?.services.map((s) => (
          <Choice
            key={s.id}
            label={s.name}
            selected={form.watch("serviceId") === s.id}
            onPress={() => form.setValue("serviceId", s.id)}
          />
        ))}
        {form.formState.errors.root?.message && (
          <Notice danger>{form.formState.errors.root.message}</Notice>
        )}
        <Button
          title="Save recipient"
          busy={form.formState.isSubmitting}
          onPress={() =>
            void form.submit(async (v) => {
              const service = catalog.data?.services.find(
                (s) => s.id === v.serviceId,
              );
              if (service && ["airtime", "data"].includes(service.category))
                v.account = phone.parse(v.account);
              await api(
                "/beneficiaries",
                mutation({
                  name: v.name,
                  kind:
                    service && ["airtime", "data"].includes(service.category)
                      ? "phone"
                      : "bill",
                  details: { account: v.account, serviceId: v.serviceId },
                }),
              );
              form.reset();
              setMessage("Recipient saved.");
              await list.refetch();
            })()
          }
        />
      </Card>
      {message && <Notice>{message}</Notice>}
    </Screen>
  );
}
