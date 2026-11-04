import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  Zap,
  Gift,
  Users,
} from "lucide-react-native";
import type {
  Wallet,
  Transaction,
  InboxNotification,
} from "@quickpay/contracts";
import { Screen } from "../../../components/layout/screen";
import { useResource } from "../../../services/api/use-resource";
import { useSession } from "../../../providers/SessionProvider";
import { BalanceCard } from "../../wallet/components/balance-card";
import { TransactionRow } from "../../transactions/components/TransactionRow";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/feedback/Feedback";
import { LinkRow } from "../../../components/ui/card/Card";
import { RecoveryCard } from "../../transactions/components/RecoveryCard";
const actions = [
  {
    title: "Add money",
    route: "/(customer)/wallet/deposit",
    icon: ArrowDownLeft,
  },
  {
    title: "Withdraw",
    route: "/(customer)/wallet/withdraw",
    icon: ArrowUpRight,
  },
  {
    title: "Airtime",
    route: "/(customer)/bills?category=airtime",
    icon: Phone,
  },
  { title: "Pay bills", route: "/(customer)/(tabs)/payments", icon: Zap },
  { title: "Gift cards", route: "/(customer)/gift-cards", icon: Gift },
  { title: "Referrals", route: "/(customer)/referrals", icon: Users },
] as const;
export function DashboardScreen() {
  const { session } = useSession();
  const wallet = useResource<Wallet>("/wallet"),
    activity = useResource<{ transactions: Transaction[] }>("/payments"),
    notifications = useResource<{ notifications: InboxNotification[] }>(
      "/notifications",
    );
  const refresh = () => {
    void wallet.refetch();
    void activity.refetch();
    void notifications.refetch();
  };
  return (
    <Screen
      title={`Hey, ${session?.user.name.split(" ")[0] || "there"}.`}
      subtitle="Let’s make your everyday move."
      onRefresh={refresh}
      refreshing={wallet.isRefetching}
    >
      {wallet.isPending ? (
        <LoadingState />
      ) : wallet.error ? (
        <ErrorState error={wallet.error} retry={refresh} />
      ) : (
        <BalanceCard wallet={wallet.data} />
      )}
      <View className="flex-row flex-wrap gap-3">
        {actions.map(({ title, route, icon: Icon }) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            onPress={() => router.push(route)}
            className="min-h-28 min-w-[28%] flex-1 items-center justify-center gap-3 rounded-3xl border border-line bg-white px-3 py-5 active:bg-violet/10"
          >
            <Icon size={25} color="#6D28D9" />
            <Text className="text-center text-sm font-bold text-ink">
              {title}
            </Text>
          </Pressable>
        ))}
      </View>
      <RecoveryCard />
      <LinkRow
        title="Your updates"
        body={
          notifications.data
            ? `${notifications.data.notifications.filter((n) => !n.read).length} unread`
            : "View account updates"
        }
        onPress={() => router.push("/(customer)/notifications")}
      />
      <View className="flex-row items-center justify-between">
        <Text accessibilityRole="header" className="text-xl font-bold text-ink">
          Recent activity
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(customer)/(tabs)/activity")}
          className="min-h-12 justify-center px-2"
        >
          <Text className="font-bold text-violet">See all</Text>
        </Pressable>
      </View>
      {activity.error ? (
        <ErrorState
          error={activity.error}
          retry={() => void activity.refetch()}
        />
      ) : activity.data?.transactions.length === 0 ? (
        <EmptyState
          title="Your story starts here"
          body="Your payments and wallet activity will appear here."
        />
      ) : (
        activity.data?.transactions
          .slice(0, 5)
          .map((t) => <TransactionRow key={t.id} transaction={t} />)
      )}
    </Screen>
  );
}
