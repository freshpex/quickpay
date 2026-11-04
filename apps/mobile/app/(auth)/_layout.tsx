import { Stack } from "expo-router";
import { BrandHeader } from "../../src/components/layout/header/Header";
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: () => <BrandHeader />,
        headerBackTitle: "Back",
        headerTintColor: "#6D28D9",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FAF9FF" },
        contentStyle: { backgroundColor: "#FAF9FF" },
      }}
    />
  );
}
