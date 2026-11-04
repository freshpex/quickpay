import { useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import type { SupportRequest } from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { useValidatedForm } from "../../../lib/forms";
import { validTransactionId } from "../../../services/deep-links/validate";
import { Screen } from "../../../components/layout/screen";
import { FormField } from "../../../components/ui/input/FormField";
import { Button } from "../../../components/ui/button";
import { Card, Row } from "../../../components/ui/card/Card";
import {
  Notice,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/feedback/Feedback";
export function SupportScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId?: string }>();
  const query = useResource<{ requests: SupportRequest[] }>("/support");
  const [message, setMessage] = useState("");
  const form = useValidatedForm(
    z.object({
      subject: z.string().trim().min(5).max(150),
      message: z.string().trim().min(10).max(3000),
    }),
    { subject: "", message: "" },
  );
  return (
    <Screen
      title="We’re here to help."
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
    >
      {validTransactionId(transactionId) && (
        <Notice>This request will include your transaction reference.</Notice>
      )}
      <FormField
        control={form.control}
        name="subject"
        label="Subject"
        autoCapitalize="sentences"
      />
      <FormField
        control={form.control}
        name="message"
        label="How can we help?"
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        autoCapitalize="sentences"
      />
      {form.formState.errors.root?.message && (
        <Notice danger>{form.formState.errors.root.message}</Notice>
      )}
      <Button
        title="Send support request"
        busy={form.formState.isSubmitting}
        onPress={() =>
          void form.submit(async (v) => {
            const result = await api<{ message: string }>(
              "/support",
              mutation({
                ...v,
                ...(validTransactionId(transactionId) ? { transactionId } : {}),
              }),
            );
            setMessage(result.message);
            form.reset();
            await query.refetch();
          })()
        }
      />
      {message && <Notice>{message}</Notice>}
      <Text accessibilityRole="header" className="text-xl font-bold text-ink">
        Your requests
      </Text>
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.requests.length ? (
        <EmptyState
          title="No requests yet"
          body="Your conversations with support appear here."
        />
      ) : (
        query.data.requests.map((r) => (
          <Card key={r.id}>
            <Row label={r.subject} value={r.status} />
            <Text className="text-base leading-6 text-ink">{r.message}</Text>
            {r.response && <Notice>{r.response}</Notice>}
          </Card>
        ))
      )}
    </Screen>
  );
}
