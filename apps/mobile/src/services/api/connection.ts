import { createConnectionRecovery } from "@quickpay/api-client";
import { fetch as nativeFetch } from "expo/fetch";
import { rawApiUrl } from "../../lib/config";
import NetInfo from "@react-native-community/netinfo";
export const connection = createConnectionRecovery({
  healthUrl: `${rawApiUrl || "https://unconfigured.invalid/api/v1"}/health`,
  fetcher: (input, init) =>
    nativeFetch(input instanceof URL ? input.toString() : input, init),
  isOnline: async () => {
    const state = await NetInfo.fetch();
    return state.isConnected !== false && state.isInternetReachable !== false;
  },
});
