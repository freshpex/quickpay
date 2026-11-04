import { useEffect } from "react";
import { AppState } from "react-native";
import { Redirect, Stack, router, usePathname } from "expo-router";
import { deferTransaction } from "../../src/services/deep-links/deferred";
import * as Notifications from "expo-notifications";
import { useSession } from "../../src/providers/SessionProvider";
import { BrandHeader } from "../../src/components/layout/header/Header";
import { LoadingState } from "../../src/components/feedback/Feedback";
import { validTransactionId } from "../../src/services/deep-links/validate";
import { syncDevice } from "../../src/services/notifications";
import { Screen } from "../../src/components/layout/screen";
import { Notice } from "../../src/components/feedback/Feedback";
import { Button } from "../../src/components/ui/button";
export default function CustomerLayout() {
  const { ready, session, error, refresh } = useSession();
  const path = usePathname();
  useEffect(() => {
    if (!session) return;
    void syncDevice(false).catch(() => {});
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data;
      if (data?.type === "notification" && validTransactionId(data.id)) {
        router.push("/(customer)/notifications");
        void Notifications.clearLastNotificationResponseAsync();
      }
    };
    void Notifications.getLastNotificationResponseAsync().then(handle);
    const sub = Notifications.addNotificationResponseReceivedListener(handle),
      app = AppState.addEventListener("change", (state) => {
        if (state === "active") void syncDevice(false).catch(() => {});
      });
    return () => {
      sub.remove();
      app.remove();
    };
  }, [session?.user.id]);
  if (!ready) return <LoadingState />;
  if (!session && error)
    return (
      <Screen title="Let’s reconnect">
        <Notice>{error}</Notice>
        <Button title="Try again" onPress={() => void refresh()} />
      </Screen>
    );
  if (!session) {
    deferTransaction(path.match(/^\/transactions\/([0-9a-f-]+)$/i)?.[1]);
    return <Redirect href="/(auth)/sign-in" />;
  }
  return (
    <Stack
      screenOptions={{
        headerTitle: () => <BrandHeader />,
        headerBackTitle: "Back",
        headerTintColor: "#6D28D9",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FAF9FF" },
        contentStyle: { backgroundColor: "#FAF9FF" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
