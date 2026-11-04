import { createApiClient } from "@quickpay/api-client";
import { secure } from "../secure-storage";
import { rawApiUrl, validateApiUrl } from "../../lib/config";
let unauthorized: () => Promise<void> = async () => {};
export const setUnauthorizedHandler = (handler: () => Promise<void>) => {unauthorized = handler;};
export const api = createApiClient({
  baseUrl: rawApiUrl || "https://unconfigured.invalid/api/v1",
  getToken: async () => {validateApiUrl(rawApiUrl, __DEV__); return secure.get("token");},
  onResponse: async response => {const token = response.headers.get("set-auth-token"); if (token) await secure.set("token", token);},
  onUnauthorized: () => unauthorized(),
});
