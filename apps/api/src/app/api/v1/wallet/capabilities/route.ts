import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { walletCapabilities } from "@quickpay/server/v1/modules/wallets/routes/capabilities";
export const GET = endpoint(walletCapabilities);
