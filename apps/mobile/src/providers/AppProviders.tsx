import { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SessionProvider } from "./SessionProvider";
import { rawApiUrl, validateApiUrl } from "../lib/config";
import { ApiFailure } from "@quickpay/api-client";
import { ConnectionStatus } from "../components/feedback/connection-status/ConnectionStatus";
import { connection } from "../services/api/connection";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20000,
      retry: (count, error) =>
        !(error instanceof ApiFailure && error.status === 0) && count < 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false, networkMode: "always" },
  },
});
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) =>
    setOnline(
      state.isConnected !== false && state.isInternetReachable !== false,
    ),
  ),
);
function NetworkStatus() {
  const net = useNetInfo();
  return net.isConnected === false || net.isInternetReachable === false ? (
    <View accessibilityLiveRegion="polite" className="bg-lime px-5 py-2">
      <Text className="text-center text-sm font-semibold text-deep">
        You’re offline. Reconnect to refresh or make a payment.
      </Text>
    </View>
  ) : null;
}
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [configError] = useState(() => {
    try {
      validateApiUrl(rawApiUrl, __DEV__);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  });
  useEffect(() => {
    if (configError) void SplashScreen.hideAsync();
    const sub = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    let failed = false;
    const unsubscribe = connection.subscribe(() => {
      const { phase } = connection.getSnapshot();
      if (phase === "connecting" || phase === "slow")
        void SplashScreen.hideAsync();
      if (phase === "offline" || phase === "unavailable") failed = true;
      if (phase === "ready" && failed) {
        failed = false;
        void queryClient.invalidateQueries();
      }
    });
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, [configError]);
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <ReducedMotionConfig mode={ReduceMotion.System} />
        <StatusBar style="dark" />
        {configError ? (
          <View className="flex-1 justify-center gap-4 bg-paper p-8">
            <Text className="text-2xl font-bold text-deep">
              Connect Quick Pay
            </Text>
            <Text className="text-base leading-7 text-ink">{configError}</Text>
          </View>
        ) : (
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <BottomSheetModalProvider>
                <NetworkStatus />
                {children}
              </BottomSheetModalProvider>
              <ConnectionStatus />
            </SessionProvider>
          </QueryClientProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
