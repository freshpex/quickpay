import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { formatMoney, type Wallet } from "@quickpay/contracts";
export function BalanceCard({ wallet }: { wallet: Wallet }) {
  const [visible, setVisible] = useState(true);
  return (
    <View className="overflow-hidden rounded-[32px] bg-deep p-6">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-base text-white/80">Available balance</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide balance" : "Show balance"}
          onPress={() => setVisible(!visible)}
          className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
        >
          {visible ? (
            <Eye size={21} color="white" />
          ) : (
            <EyeOff size={21} color="white" />
          )}
        </Pressable>
      </View>
      <Animated.Text
        key={String(visible)}
        entering={FadeIn.duration(130)}
        exiting={FadeOut.duration(80)}
        className="text-4xl font-extrabold tracking-tight text-white"
        accessibilityLabel={
          visible
            ? `Available balance ${formatMoney(wallet.available)}`
            : "Balance hidden"
        }
      >
        {visible ? formatMoney(wallet.available) : "••••••"}
      </Animated.Text>
      <View className="mt-5 flex-row flex-wrap gap-4">
        <Text className="text-sm text-white/75">
          Reserved {visible ? formatMoney(wallet.reserved) : "••••"}
        </Text>
        <Text className="text-sm text-lime">
          Rewards {visible ? formatMoney(wallet.rewards) : "••••"}
        </Text>
      </View>
    </View>
  );
}
