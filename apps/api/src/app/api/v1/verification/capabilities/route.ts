import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { capabilities } from "@quickpay/server/v1/modules/verification/routes/handler";
export const GET = endpoint(async (req) => capabilities(req));
