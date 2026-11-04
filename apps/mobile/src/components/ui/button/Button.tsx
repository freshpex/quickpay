import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, ReduceMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Button({ title, onPress, busy = false, disabled = false, secondary = false, destructive = false, accessibilityLabel }: {title: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean; destructive?: boolean; accessibilityLabel?: string}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} accessibilityState={{disabled: disabled || busy, busy}} disabled={disabled || busy} onPressIn={() => {scale.value = withTiming(.97, {duration: 90, reduceMotion: ReduceMotion.System});}} onPressOut={() => {scale.value = withTiming(1, {duration: 120, reduceMotion: ReduceMotion.System});}} onPress={() => {void Haptics.selectionAsync().catch(() => {}); onPress();}} style={animated} className={`min-h-14 flex-row items-center justify-center gap-2 rounded-2xl px-5 py-4 ${disabled || busy ? "opacity-50" : ""} ${destructive ? "bg-danger" : secondary ? "border border-line bg-white" : "bg-violet"}`}>
    {busy && <ActivityIndicator color={secondary ? "#6D28D9" : "white"} />}<Text className={`text-center text-base font-bold ${secondary ? "text-ink" : "text-white"}`}>{title}</Text>
  </AnimatedPressable>;
}
