import { Text, View } from "react-native";
import { Card } from "../../components/ui/card/Card";
export function ComingSoon() {
  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-xl font-bold text-ink">
        Coming soon
      </Text>
      <Card>
        <Text className="text-lg font-bold text-ink">Virtual numbers</Text>
        <Text className="font-bold text-violet">
          Coming soon · Preview only
        </Text>
        <Text className="text-base text-muted">
          Explore numbers for supported services such as WhatsApp and Telegram.
          Availability will depend on country and service support.
        </Text>
      </Card>
      <Card>
        <Text className="text-lg font-bold text-ink">
          Social followers &amp; subscribers
        </Text>
        <Text className="font-bold text-violet">
          Coming soon · Preview only
        </Text>
        <Text className="text-base text-muted">
          Planned services for X, YouTube, Facebook, TikTok, Instagram and more.
        </Text>
      </Card>
    </View>
  );
}
