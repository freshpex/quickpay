import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { sales } from "@quickpay/server/v1/modules/gift-cards/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => sales(req), true);
export const POST = endpoint(async (req, _ctx) => sales(req), true);
