import { useState } from "react";
import { ScrollView } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { states, type Transaction } from "@quickpay/contracts";
import { api } from "../../../services/api";
import { useSession } from "../../../providers/SessionProvider";
import { Screen } from "../../../components/layout/screen";
import { Input } from "../../../components/ui/input";
import { Choice } from "../../../components/ui/choice/Choice";
import { Button } from "../../../components/ui/button";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/feedback/Feedback";
import { TransactionRow } from "../components/TransactionRow";
import { RecoveryCard } from "../components/RecoveryCard";
import { statusLabels } from "../lib/status";
export function ActivityScreen() {
  const { session } = useSession();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all");
  const result = useInfiniteQuery({
    queryKey: [session?.user.id, "history"],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      api<{ transactions: Transaction[]; nextCursor: string | null }>(
        `/payments${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (page) => page.nextCursor,
    retry: 1,
  });
  const items = result.data?.pages
    .flatMap((p) => p.transactions)
    .filter(
      (t) =>
        (status === "all" || t.status === status) &&
        `${t.reference} ${t.kind} ${t.serviceId || ""} ${t.amount}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
  return (
    <Screen
      title="Your money in motion."
      subtitle="Every payment, with its current status."
      onRefresh={() => void result.refetch()}
      refreshing={result.isRefetching}
    >
      <RecoveryCard />
      <Input
        label="Search loaded transactions"
        placeholder="Reference, service or amount in kobo"
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        <Choice
          label="All"
          selected={status === "all"}
          onPress={() => setStatus("all")}
        />
        {states.map((s) => (
          <Choice
            key={s}
            label={statusLabels[s]}
            selected={status === s}
            onPress={() => setStatus(s)}
          />
        ))}
      </ScrollView>
      {result.isPending ? (
        <LoadingState />
      ) : result.error ? (
        <ErrorState error={result.error} retry={() => void result.refetch()} />
      ) : !items?.length ? (
        <EmptyState
          title="No matching activity"
          body="Try another search or load more history."
        />
      ) : (
        items.map((t) => <TransactionRow key={t.id} transaction={t} />)
      )}
      {result.hasNextPage && (
        <Button
          title="Load older transactions"
          busy={result.isFetchingNextPage}
          secondary
          onPress={() => void result.fetchNextPage()}
        />
      )}
    </Screen>
  );
}
