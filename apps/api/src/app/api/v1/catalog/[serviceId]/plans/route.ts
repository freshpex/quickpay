import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { plans } from "@quickpay/server/v1/modules/billers/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(
  async (req, ctx) => plans(req, (await ctx.params).serviceId),
  true,
);
