import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { purchases } from "@quickpay/server/v1/modules/gift-cards/routes/purchases";
export const GET = endpoint(purchases);
export const POST = endpoint(purchases);
