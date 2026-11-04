import { Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatMoney, type GiftQuote } from "@quickpay/contracts";
import { Row } from "../../../components/ui/card/Card";
export function QuoteCard({
  quote,
  expired,
}: {
  quote: GiftQuote;
  expired: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      className="gap-4 rounded-[32px] bg-lime p-6"
    >
      <Text className="text-sm font-semibold uppercase tracking-widest text-deep">
        Your card, quoted
      </Text>
      <Text className="text-4xl font-extrabold text-deep">
        {formatMoney(quote.amount)}
      </Text>
      <Row label={quote.brand} value={`${quote.region} · ${quote.cardType}`} />
      <Text className="text-sm text-deep">
        {expired
          ? "This quote has expired. Request a fresh quote."
          : `Expires ${new Intl.DateTimeFormat("en-NG", { timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(quote.expiresAt))} (Lagos)`}
      </Text>
    </Animated.View>
  );
}
