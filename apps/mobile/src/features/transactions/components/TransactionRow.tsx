import { Text, View, Pressable } from "react-native";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react-native";
import { router } from "expo-router";
import { formatMoney, type Transaction } from "@quickpay/contracts";
import { localDate, statusLabels } from "../lib/status";
export function TransactionRow({
  transaction: t,
}: {
  transaction: Transaction;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.kind}, ${formatMoney(t.amount)}, ${statusLabels[t.status]}`}
      onPress={() => router.push(`/(customer)/transactions/${t.id}`)}
      className="min-h-20 flex-row items-center gap-3 rounded-2xl border border-line bg-white p-4"
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-violet/10">
        {t.kind === "deposit" ? (
          <ArrowDownLeft size={22} color="#6D28D9" />
        ) : (
          <ArrowUpRight size={22} color="#6D28D9" />
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-bold capitalize text-ink">
          {t.serviceId || t.kind.replaceAll("_", " ")}
        </Text>
        <Text className="text-xs text-muted">{localDate(t.createdAt)}</Text>
        <Text
          className={`text-sm font-medium ${t.status === "successful" ? "text-green-700" : t.status === "failed" ? "text-danger" : "text-muted"}`}
        >
          {statusLabels[t.status]}
        </Text>
      </View>
      <Text className="text-base font-bold text-ink">
        {formatMoney(t.amount)}
      </Text>
    </Pressable>
  );
}
