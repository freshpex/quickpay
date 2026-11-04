import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { getWallet } from "@quickpay/server/v1/modules/wallets/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => getWallet(req), true);
