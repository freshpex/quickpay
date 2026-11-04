import "../global.css";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Button } from "../src/components/ui/button";
import { AppProviders } from "../src/providers/AppProviders";
import { useReducedMotion } from "react-native-reanimated";
void SplashScreen.preventAutoHideAsync().catch(() => {});
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  void SplashScreen.hideAsync();
  return (
    <View className="flex-1 justify-center gap-5 bg-paper p-6">
      <Text className="text-3xl font-bold text-deep">
        Let’s try that again.
      </Text>
      <Text className="text-base leading-6 text-ink">
        We could not open this screen. Your payments remain in your account;
        check Activity after reconnecting.
      </Text>
      <Button title="Try again" onPress={() => void retry()} />
    </View>
  );
}
export default function RootLayout() {
  const reducedMotion = useReducedMotion();
  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FAF9FF" },
          animation: reducedMotion ? "none" : "slide_from_right",
        }}
      />
    </AppProviders>
  );
}
