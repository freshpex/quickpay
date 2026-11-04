import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { paystackWebhook } from "@quickpay/server/v1/modules/deposits/routes/webhook";
export const runtime = "nodejs";
export const POST = endpoint(async (req, _ctx) => paystackWebhook(req), false);
