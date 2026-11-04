import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { upload } from "@quickpay/server/v1/modules/gift-cards/routes/handler";
export const runtime = "nodejs";
export const POST = endpoint(async (req, _ctx) => upload(req), true);
