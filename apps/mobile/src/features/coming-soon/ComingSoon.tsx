import { Pressable, Text, View } from "react-native";

export function ComingSoon() {
  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-xl font-bold text-ink">
        Coming soon
      </Text>
      <Pressable
        disabled
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        className="gap-2 rounded-3xl border border-line bg-white p-5 opacity-70"
      >
        <Text className="text-lg font-bold text-ink">Virtual numbers</Text>
        <Text className="font-bold text-violet">Coming soon</Text>
        <Text className="text-base text-muted">
          Explore numbers for supported services such as WhatsApp and Telegram.
          Availability will depend on country and service support.
        </Text>
      </Pressable>
      <Pressable
        disabled
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        className="gap-2 rounded-3xl border border-line bg-white p-5 opacity-70"
      >
        <Text className="text-lg font-bold text-ink">
          Social media boosting
        </Text>
        <Text className="font-bold text-violet">Coming soon</Text>
        <Text className="text-base text-muted">
          Planned services for X, YouTube, Facebook, TikTok, Instagram and more.
        </Text>
      </Pressable>
    </View>
  );
}
