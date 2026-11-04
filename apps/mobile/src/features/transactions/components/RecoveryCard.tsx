import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../../providers/SessionProvider";
import { loadPending } from "../services/native-operation";
import { LinkRow } from "../../../components/ui/card/Card";
export function RecoveryCard() {
  const { session } = useSession();
  const pending = useQuery({
    queryKey: [session?.user.id, "pending-operation"],
    queryFn: loadPending,
    refetchInterval: 5000,
  });
  return pending.data && pending.data.userId === session?.user.id ? (
    <LinkRow
      title="Continue checking your payment"
      body="An earlier request needs a status check."
      onPress={() => router.push("/(customer)/transactions/recover")}
    />
  ) : null;
}
