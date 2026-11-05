import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { Sheet } from "../../../components/ui/bottom-sheet/Sheet";
import { Input } from "../../../components/ui/input";
import { Choice } from "../../../components/ui/choice/Choice";
import { Button } from "../../../components/ui/button";
export function BankPicker({
  banks,
  value,
  onChange,
}: {
  banks: { code: string; name: string }[];
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const filtered = banks.filter((b) =>
    b.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <View className="gap-2">
        <Text className="text-sm font-bold text-ink">Bank</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a bank"
          accessibilityState={{ expanded: open }}
          onPress={() => {
            setSearch("");
            setOpen(true);
          }}
          className="min-h-14 flex-row items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4"
        >
          <Text className="flex-1 text-base text-ink">
            {banks.find((b) => b.code === value)?.name || "Choose a bank"}
          </Text>
          <ChevronDown size={20} color="#6d28d9" />
        </Pressable>
      </View>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <Text className="text-xl font-extrabold text-ink">
          Choose your bank
        </Text>
        <Input
          label="Search banks"
          placeholder="Type a bank name"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {filtered.map((b) => (
          <Choice
            key={b.code}
            label={b.name}
            selected={value === b.code}
            onPress={() => {
              onChange(b.code);
              setOpen(false);
            }}
          />
        ))}
        {!filtered.length && (
          <Text className="text-sm text-muted">
            No matching banks. Try another name.
          </Text>
        )}
        <Button
          secondary
          title="Close bank list"
          onPress={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}
