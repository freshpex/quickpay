import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { evidence } from "@quickpay/server/v1/modules/gift-cards/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(
  async (req, ctx) => evidence(req, (await ctx.params).evidenceId),
  true,
);
