import { forwardRef } from "react";
import { TextInput, Text, View, type TextInputProps } from "react-native";
export type InputProps = TextInputProps & {label: string; error?: string; trailing?: React.ReactNode};
export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, trailing, ...props }, ref) {
  return <View className="gap-2"><Text className="text-sm font-semibold text-ink">{label}</Text><View className={`min-h-14 flex-row items-center rounded-2xl border bg-white ${error ? "border-danger" : "border-line"}`}><TextInput ref={ref} accessibilityLabel={label} accessibilityHint={error} placeholderTextColor="#8D819A" className="min-h-14 flex-1 px-4 py-3 text-base text-ink" autoCapitalize="none" autoCorrect={false} returnKeyType="next" {...props} />{trailing}</View>{error && <Text accessibilityRole="alert" className="text-sm text-danger">{error}</Text>}</View>;
});
