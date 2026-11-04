import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { identity } from "@quickpay/server/shared/auth";
import { giftCardBuyer } from "@quickpay/server/v1/modules/gift-cards/providers/purchase-provider";
import { json } from "@quickpay/server/shared/infrastructure/http";
export const POST = endpoint(async (req) => {
  await identity(req);
  return json(await giftCardBuyer.catalog());
});
