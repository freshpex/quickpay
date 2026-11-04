import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { notifications } from "@quickpay/server/v1/modules/notifications/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => notifications(req), true);
export const PATCH = endpoint(async (req, _ctx) => notifications(req), true);
