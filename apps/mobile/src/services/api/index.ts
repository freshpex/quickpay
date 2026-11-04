import { createApiClient } from "@quickpay/api-client";
import { connection } from "./connection";
import { secure } from "../secure-storage";
import { rawApiUrl, validateApiUrl } from "../../lib/config";
let unauthorized: () => Promise<void> = async () => {};
export const setUnauthorizedHandler = (handler: () => Promise<void>) => {
  unauthorized = handler;
};
export const api = createApiClient({
  baseUrl: rawApiUrl || "https://unconfigured.invalid/api/v1",
  fetcher: connection.fetch,
  getToken: async () => {
    validateApiUrl(rawApiUrl, __DEV__);
    return secure.get("token");
  },
  onResponse: async (response, context) => {
    const token = response.headers.get("set-auth-token");
    if (token && context.token && (await secure.get("token")) === context.token)
      await secure.set("token", token);
  },
  onUnauthorized: async ({ token }) => {
    if (token && (await secure.get("token")) === token) await unauthorized();
  },
});
