import { useEffect, useState } from "react";
import { z } from "zod";
import type { ProfileUser } from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { useSession } from "../../../providers/SessionProvider";
import { useValidatedForm } from "../../../lib/forms";
import { Screen } from "../../../components/layout/screen";
import { FormField } from "../../../components/ui/input/FormField";
import { Button } from "../../../components/ui/button";
import { Card, Row } from "../../../components/ui/card/Card";
import {
  Notice,
  LoadingState,
  ErrorState,
} from "../../../components/feedback/Feedback";
export function ProfileScreen() {
  const query = useResource<{ user: ProfileUser }>("/profile"),
    { refresh } = useSession();
  const [message, setMessage] = useState("");
  const form = useValidatedForm(
    z.object({ name: z.string().trim().min(3).max(100) }),
    { name: "" },
  );
  useEffect(() => {
    if (query.data) form.reset({ name: query.data.user.name });
  }, [query.data]);
  return (
    <Screen
      title="All about you."
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
    >
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <FormField
            control={form.control}
            name="name"
            label="Full name"
            autoCapitalize="words"
            autoComplete="name"
          />
          {form.formState.errors.root?.message && (
            <Notice danger>{form.formState.errors.root.message}</Notice>
          )}
          <Button
            title="Save name"
            busy={form.formState.isSubmitting}
            onPress={() =>
              void form.submit(async (v) => {
                const r = await api<{ message: string }>("/profile", {
                  ...mutation(v),
                  method: "PATCH",
                });
                setMessage(r.message);
                await query.refetch();
                await refresh();
              })()
            }
          />
          <Card>
            <Row label="Email" value={query.data.user.email} />
            <Row
              label="Email verification"
              value={
                query.data.user.email_verified
                  ? "Verified"
                  : "Verification required"
              }
            />
            <Row label="Phone" value={query.data.user.phone_number} />
            <Row
              label="Phone verification"
              value={
                query.data.user.phone_verified
                  ? "Verified"
                  : "Verification required"
              }
            />
            <Row
              label="Accepted policy"
              value={query.data.user.policy_version}
            />
          </Card>
        </>
      )}
      {message && <Notice>{message}</Notice>}
    </Screen>
  );
}
