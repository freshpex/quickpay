import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { identity } from "@quickpay/server/shared/auth";
import { assert } from "@quickpay/server/shared/errors";
import {
  ownPayment,
  publicTransaction,
} from "@quickpay/server/v1/modules/payments/repositories/payment.repository";
import { renderReceipt } from "@quickpay/server/v1/modules/payments/services/receipt";
export const GET = endpoint(async (req, ctx) => {
  const session = await identity(req);
  const { paymentId } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") || "pdf";
  assert(
    format === "pdf" || format === "png",
    "INVALID_FORMAT",
    "Choose PDF or PNG.",
  );
  const payment = publicTransaction(
    await ownPayment(paymentId, session.user.id),
  );
  const bytes = await renderReceipt(
    { ...payment, createdAt: payment.createdAt.toISOString() },
    format,
  );
  return new Response(new Uint8Array(bytes).buffer, {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "image/png",
      "Content-Disposition": `attachment; filename="QuickPay-receipt-${payment.id}.${format}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
