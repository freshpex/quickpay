import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
export function Choice({
  label,
  selected,
  onPress,
  disabled = false,
  detail,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  detail?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-14 flex-row items-center gap-3 rounded-2xl border p-4 ${selected ? "border-violet bg-violet/10" : "border-line bg-white"} ${disabled ? "opacity-50" : ""}`}
    >
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-ink">{label}</Text>
        {detail && <Text className="text-sm text-muted">{detail}</Text>}
      </View>
      {selected && <Check color="#6D28D9" size={20} />}
    </Pressable>
  );
}
