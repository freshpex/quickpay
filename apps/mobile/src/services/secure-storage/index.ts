import * as SecureStore from "expo-secure-store";
import { storageScope } from "../../lib/config";
const options = {keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
export const secure = {
  get: (key: string) => SecureStore.getItemAsync(`${storageScope}_${key}`, options),
  set: (key: string, value: string) => SecureStore.setItemAsync(`${storageScope}_${key}`, value, options),
  remove: (key: string) => SecureStore.deleteItemAsync(`${storageScope}_${key}`, options),
};
// The official auth plugin uses this adapter for session and MFA challenge cookies.
export const authStorage = {
  getItem: (key: string) => SecureStore.getItem(`${storageScope}_${key}`, options),
  setItem: (key: string, value: string) => {SecureStore.setItem(`${storageScope}_${key}`, value, options); const keys: string[] = JSON.parse(SecureStore.getItem(`${storageScope}_auth_keys`, options) || "[]"); if (!keys.includes(key)) SecureStore.setItem(`${storageScope}_auth_keys`, JSON.stringify([...keys, key]), options);},
};
export async function clearAuthStorage() {
  const keys: string[] = JSON.parse(await secure.get("auth_keys") || "[]");
  await Promise.all(keys.map(key => secure.remove(key)));
  await Promise.all([secure.remove("auth_keys"), secure.remove("token"), secure.remove("pending")]);
}
