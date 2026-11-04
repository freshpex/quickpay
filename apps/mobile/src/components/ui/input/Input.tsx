import { forwardRef, useContext } from "react";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { cssInterop } from "nativewind";
import { InsideSheet } from "../bottom-sheet/context";
import { TextInput, Text, View, type TextInputProps } from "react-native";
const SheetTextInput = cssInterop(BottomSheetTextInput, {className: "style"});
export type InputProps = TextInputProps & {
  label: string;
  error?: string;
  trailing?: React.ReactNode;
};
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, trailing, ...props },
  ref,
) {
  const inSheet = useContext(InsideSheet);
  const Control = inSheet ? SheetTextInput : TextInput;
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink">{label}</Text>
      <View
        className={`min-h-14 flex-row items-center rounded-2xl border bg-white ${error ? "border-danger" : "border-line"}`}
      >
        <Control
          ref={(instance: TextInput | null | undefined) => {if (typeof ref === "function") ref(instance || null); else if (ref) ref.current = instance || null;}}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor="#8D819A"
          className="min-h-14 flex-1 px-4 py-3 text-base text-ink"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          {...props}
        />
        {trailing}
      </View>
      {error && (
        <Text accessibilityRole="alert" className="text-sm text-danger">
          {error}
        </Text>
      )}
    </View>
  );
});
