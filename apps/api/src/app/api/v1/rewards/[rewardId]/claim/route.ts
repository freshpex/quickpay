import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { claimReward } from "@quickpay/server/v1/modules/rewards/routes/handler";
export const runtime = "nodejs";
export const POST = endpoint(
  async (req, ctx) => claimReward(req, (await ctx.params).rewardId),
  true,
);
