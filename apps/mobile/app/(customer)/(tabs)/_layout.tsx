import { Pressable } from "react-native";
import { Tabs, router } from "expo-router";
import {
  House,
  CreditCard,
  ListOrdered,
  UserRound,
  Bell,
} from "lucide-react-native";
import { BrandHeader } from "../../../src/components/layout/header/Header";
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <BrandHeader />,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FAF9FF" },
        tabBarActiveTintColor: "#6D28D9",
        tabBarInactiveTintColor: "#71677E",
        tabBarStyle: { backgroundColor: "#FAF9FF", borderTopColor: "#E9E2F3" },
        tabBarLabelStyle: { fontWeight: "600" },
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => router.push("/(customer)/notifications")}
            className="mr-3 h-12 w-12 items-center justify-center"
          >
            <Bell color="#6D28D9" size={22} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          tabBarIcon: ({ color, size }) => (
            <CreditCard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => (
            <ListOrdered color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <UserRound color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
