import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { recoverPayment } from "@quickpay/server/v1/modules/payments/routes/recovery";
export const GET = endpoint(async (req, ctx) =>
  recoverPayment(req, (await ctx.params).key),
);
