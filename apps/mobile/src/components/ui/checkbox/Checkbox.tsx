import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
export function Checkbox({
  checked,
  onChange,
  label,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  error?: string;
}) {
  return (
    <View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        className="min-h-12 flex-row items-center gap-3 py-2"
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-lg border ${checked ? "border-violet bg-violet" : "border-muted bg-white"}`}
        >
          {checked && <Check size={17} color="white" />}
        </View>
        <Text className="flex-1 text-sm leading-6 text-ink">{label}</Text>
      </Pressable>
      {error && (
        <Text accessibilityRole="alert" className="text-sm text-danger">
          {error}
        </Text>
      )}
    </View>
  );
}
