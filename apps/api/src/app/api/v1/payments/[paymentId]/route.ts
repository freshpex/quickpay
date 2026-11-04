import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { getPayment } from "@quickpay/server/v1/modules/payments/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(
  async (req, ctx) => getPayment(req, (await ctx.params).paymentId),
  true,
);
