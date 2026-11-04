import { router } from "expo-router";
import { Screen } from "../../../components/layout/screen";
import { useResource } from "../../../services/api/use-resource";
import {
  Notice,
  ErrorState,
  LoadingState,
} from "../../../components/feedback/Feedback";
import { Button } from "../../../components/ui/button";
export function ExchangesScreen() {
  const query = useResource<{ pairs: unknown[]; message: string }>(
    "/exchanges",
  );
  return (
    <Screen
      title="Exchanges."
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
    >
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Notice>{query.data.message}</Notice>
      )}
      <Button
        title="Explore gift-card sales"
        onPress={() => router.push("/(customer)/gift-cards")}
      />
    </Screen>
  );
}
