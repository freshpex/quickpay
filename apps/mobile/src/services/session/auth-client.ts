import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import { authStorage, secure } from "../secure-storage";
import { rawApiUrl } from "../../lib/config";
export const authClient = createAuthClient({
  baseURL: `${rawApiUrl || "https://unconfigured.invalid/api/v1"}/auth`,
  plugins: [
    expoClient({
      scheme: "quickpay-dev",
      storagePrefix: "auth",
      storage: authStorage,
      disableCache: true,
    }),
    twoFactorClient(),
  ],
  fetchOptions: {
    onSuccess: async (ctx) => {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) await secure.set("token", token);
    },
  },
});
