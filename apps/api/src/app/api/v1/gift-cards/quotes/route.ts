import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { quote } from "@quickpay/server/v1/modules/gift-cards/routes/handler";
export const runtime = "nodejs";
export const POST = endpoint(async (req, _ctx) => quote(req), true);
