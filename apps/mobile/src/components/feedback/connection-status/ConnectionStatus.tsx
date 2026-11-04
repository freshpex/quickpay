import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConnection } from "../../../services/api/use-connection";
import { connection } from "../../../services/api/connection";
export function ConnectionStatus() {
  const { phase } = useConnection();
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) =>
      setKeyboard(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (phase === "idle" || phase === "ready" || phase === "offline") return null;
  const waiting = phase === "connecting" || phase === "slow";
  return (
    <View
      accessibilityLiveRegion="polite"
      className="absolute inset-x-4 z-50 flex-row items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-lg"
      style={{ bottom: Math.max(insets.bottom, keyboard) + 12 }}
    >
      {waiting && (
        <ActivityIndicator accessibilityLabel="Connecting" color="#6D28D9" />
      )}
      <View className="flex-1 gap-1">
        <Text className="text-sm font-bold text-deep">
          {waiting ? "Securing connection…" : "Let’s reconnect"}
        </Text>
        <Text className="text-xs leading-5 text-muted">
          {phase === "slow"
            ? "Taking a little longer. Keep Quick Pay open; your details are still here."
            : waiting
              ? "Getting things ready for you. This may take a moment."
              : "Connecting is taking longer than usual. Your details are still here."}
        </Text>
      </View>
      {!waiting && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try connecting again"
          className="min-h-12 justify-center rounded-xl bg-violet px-3"
          onPress={() => {
            connection.invalidate();
            void connection.ready().catch(() => {});
          }}
        >
          <Text className="font-bold text-white">Try again</Text>
        </Pressable>
      )}
    </View>
  );
}
