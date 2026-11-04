import { useEffect } from "react";
import { Image, View } from "react-native";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSession } from "../src/providers/SessionProvider";
import { Notice } from "../src/components/feedback/Feedback";
import { Button } from "../src/components/ui/button";
import headerDark from "../assets/brand/header-dark.png";
void SplashScreen.preventAutoHideAsync().catch(() => {});
export default function Entry() {
  const { ready, session, error, refresh } = useSession();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready || error)
    return (
      <View className="flex-1 items-center justify-center gap-5 bg-deep p-6">
        <Animated.View entering={FadeIn.duration(240)}>
          <Image
            source={headerDark}
            resizeMode="contain"
            accessibilityLabel="Quick Pay"
            className="h-16 w-64"
          />
        </Animated.View>
        {error && (
          <>
            <Notice>{error}</Notice>
            <Button title="Reconnect" onPress={() => void refresh()} />
          </>
        )}
      </View>
    );
  return <Redirect href={session ? "/(customer)/(tabs)" : "/(auth)/sign-in"} />;
}
