import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { exchanges } from "@quickpay/server/v1/modules/exchanges/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => exchanges(req), true);
