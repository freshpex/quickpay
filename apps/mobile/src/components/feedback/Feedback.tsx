import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "../ui/button";
export function Notice({
  children,
  danger = false,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className={`rounded-2xl p-4 ${danger ? "bg-red-50" : "bg-violet/10"}`}
    >
      <Text
        className={`text-sm leading-6 ${danger ? "text-danger" : "text-deep"}`}
      >
        {children}
      </Text>
    </View>
  );
}
export function LoadingState() {
  return (
    <View accessibilityLabel="Loading" className="items-center gap-3 py-12">
      <ActivityIndicator color="#6D28D9" />
      <Text className="text-muted">Loading your information…</Text>
    </View>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <View className="gap-3">
      <Notice danger>
        {error instanceof Error
          ? error.message
          : "We could not load this information. Please try again."}
      </Notice>
      <Button title="Try again" onPress={retry} secondary />
    </View>
  );
}
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-2 rounded-3xl border border-dashed border-line bg-white p-6">
      <Text className="text-lg font-bold text-ink">{title}</Text>
      <Text className="text-base leading-6 text-muted">{body}</Text>
    </View>
  );
}
