import { useState } from "react";
import { Pressable } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Input, type InputProps } from "../input";
export function PasswordInput(props: Omit<InputProps, "secureTextEntry" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return <Input {...props} secureTextEntry={!visible} trailing={<Pressable accessibilityRole="button" accessibilityLabel={`${visible ? "Hide" : "Show"} ${props.label.toLowerCase()}`} accessibilityState={{selected: visible}} onPress={() => setVisible(v => !v)} className="min-h-12 min-w-12 items-center justify-center px-3">{visible ? <EyeOff color="#6D28D9" size={21} /> : <Eye color="#6D28D9" size={21} />}</Pressable>} />;
}
