import { router } from "expo-router";
import { categories, type Service } from "@quickpay/contracts";
import { Screen } from "../../../components/layout/screen";
import { useResource } from "../../../services/api/use-resource";
import { LinkRow } from "../../../components/ui/card/Card";
import {
  ErrorState,
  LoadingState,
} from "../../../components/feedback/Feedback";
const names: Record<(typeof categories)[number], string> = {
  airtime: "Airtime",
  data: "Mobile data",
  electricity: "Electricity",
  television: "Television",
  internet: "Internet",
  education: "Education",
  other: "More bills",
};
export function PaymentsScreen() {
  const catalog = useResource<{ services: Service[] }>("/catalog");
  return (
    <Screen
      title="Life, paid for."
      subtitle="A few taps. One less thing on your list."
      onRefresh={() => void catalog.refetch()}
      refreshing={catalog.isRefetching}
    >
      {catalog.isPending ? (
        <LoadingState />
      ) : catalog.error ? (
        <ErrorState
          error={catalog.error}
          retry={() => void catalog.refetch()}
        />
      ) : (
        categories.map((category) => (
          <LinkRow
            key={category}
            title={names[category]}
            body={
              catalog.data.services.some(
                (s) => s.category === category && s.available,
              )
                ? "Choose a service"
                : "Currently unavailable"
            }
            onPress={() =>
              router.push({
                pathname: "/(customer)/bills",
                params: { category },
              })
            }
          />
        ))
      )}
      <LinkRow
        title="Saved recipients"
        body="Pay someone again, with fewer details."
        onPress={() => router.push("/(customer)/beneficiaries")}
      />
      <LinkRow
        title="Gift cards"
        onPress={() => router.push("/(customer)/gift-cards")}
      />
      <LinkRow
        title="Exchanges"
        onPress={() => router.push("/(customer)/exchanges")}
      />
    </Screen>
  );
}
