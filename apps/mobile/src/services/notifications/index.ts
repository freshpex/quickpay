import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Crypto from "expo-crypto";
import { mutation } from "@quickpay/api-client";
import type { NotificationPreferences } from "@quickpay/contracts";
import { api } from "../api";
import { secure } from "../secure-storage";
export async function syncDevice(requestPermission: boolean) {
  const prefs = await api<NotificationPreferences>(
    "/notifications/preferences",
  );
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!prefs.pushAvailable || !projectId) {
    if (requestPermission)
      throw new Error(
        "Push notifications are currently unavailable. Your updates remain in the app.",
      );
    return;
  }
  if (!Device.isDevice) {
    if (requestPermission)
      throw new Error(
        "Push notifications need a physical device with a development or installed build.",
      );
    return;
  }
  let id = await secure.get("installation");
  if (!id) {
    id = Crypto.randomUUID();
    await secure.set("installation", id);
  }
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("updates", {
      name: "Quick Pay updates",
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    await api("/notifications/devices", {
      ...mutation({ installationId: id }),
      method: "DELETE",
    });
    if (requestPermission)
      throw new Error(
        "Allow notifications in your device settings to receive Quick Pay updates.",
      );
    return;
  }
  if (!prefs.pushEnabled && !requestPermission) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api(
    "/notifications/devices",
    mutation({ installationId: id, token, platform: Platform.OS }),
  );
  if (requestPermission)
    await api("/notifications/preferences", {
      ...mutation({ pushEnabled: true }),
      method: "PATCH",
    });
}
export async function disablePush() {
  const id = await secure.get("installation");
  await api("/notifications/preferences", {
    ...mutation({ pushEnabled: false }),
    method: "PATCH",
  });
  if (id)
    await api("/notifications/devices", {
      ...mutation({ installationId: id }),
      method: "DELETE",
    });
}
