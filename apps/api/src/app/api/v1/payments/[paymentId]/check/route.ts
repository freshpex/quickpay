import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { checkPayment } from "@quickpay/server/v1/modules/payments/routes/handler";
export const runtime = "nodejs";
export const POST = endpoint(
  async (req, ctx) => checkPayment(req, (await ctx.params).paymentId),
  true,
);
