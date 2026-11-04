import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { activeRule } from "@quickpay/server/v1/modules/rewards/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (_req, _ctx) => activeRule(), true);
