import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { sendCode } from "@quickpay/server/v1/modules/verification/routes/phone";
export const POST = endpoint(async (req) => sendCode(req));
