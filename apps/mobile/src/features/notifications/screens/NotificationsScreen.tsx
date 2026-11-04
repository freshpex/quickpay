import { useState } from "react";
import { Pressable, Text } from "react-native";
import type {
  InboxNotification,
  NotificationPreferences,
} from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { syncDevice, disablePush } from "../../../services/notifications";
import { Screen } from "../../../components/layout/screen";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card/Card";
import {
  Notice,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/feedback/Feedback";
import { localDate } from "../../transactions/lib/status";
export function NotificationsScreen() {
  const list = useResource<{ notifications: InboxNotification[] }>(
      "/notifications",
    ),
    prefs = useResource<NotificationPreferences>("/notifications/preferences");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <Screen
      title="Your updates."
      subtitle="Stay close to what’s happening."
      onRefresh={() => {
        void list.refetch();
        void prefs.refetch();
      }}
      refreshing={list.isRefetching}
    >
      <Card>
        {prefs.data?.pushAvailable ? (
          <Button
            title={
              prefs.data.pushEnabled
                ? "Turn off push notifications"
                : "Enable push notifications"
            }
            secondary
            busy={busy}
            onPress={() => {
              if (busy) return;
              setBusy(true);
              void (prefs.data.pushEnabled ? disablePush() : syncDevice(true))
                .then(() => prefs.refetch())
                .catch((e) => setMessage(e.message))
                .finally(() => setBusy(false));
            }}
          />
        ) : (
          <Notice>
            Push notifications are currently unavailable. Your account updates
            appear below.
          </Notice>
        )}
      </Card>
      {message && <Notice>{message}</Notice>}
      {list.isPending ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : !list.data.notifications.length ? (
        <EmptyState
          title="You’re up to date"
          body="Payment and support updates will appear here."
        />
      ) : (
        list.data.notifications.map((n) => (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            accessibilityLabel={`${n.title}, ${n.read ? "read" : "unread"}. Mark as read`}
            onPress={() => {
              if (!n.read)
                void api("/notifications", {
                  ...mutation({ id: n.id }),
                  method: "PATCH",
                })
                  .then(() => list.refetch())
                  .catch((e) => setMessage(e.message));
            }}
            className={`gap-2 rounded-3xl border p-5 ${n.read ? "border-line bg-white" : "border-violet/30 bg-violet/10"}`}
          >
            <Text className="text-lg font-bold text-ink">{n.title}</Text>
            <Text className="text-base leading-6 text-ink">{n.body}</Text>
            <Text className="text-xs text-muted">
              {localDate(n.created_at)}
            </Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
