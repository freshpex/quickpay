import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { createOperation } from "@quickpay/server/v1/modules/payments/services/create-payment";
export const POST = endpoint(async (req) => createOperation(req, "withdrawal"));
