import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF9FF" }}>
          <KeyboardAvoidingView
            style={{ flex: 1, padding: 20, gap: 16 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
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
            <FlatList
              data={filtered}
              keyExtractor={(bank) => bank.code}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
              renderItem={({ item: bank }) => (
                <Choice
                  label={bank.name}
                  selected={value === bank.code}
                  onPress={() => {
                    onChange(bank.code);
                    setOpen(false);
                  }}
                />
              )}
              ListEmptyComponent={
                <Text className="text-sm text-muted">
                  No matching banks. Try another name.
                </Text>
              }
            />
            <Button
              secondary
              title="Close bank list"
              onPress={() => setOpen(false)}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
