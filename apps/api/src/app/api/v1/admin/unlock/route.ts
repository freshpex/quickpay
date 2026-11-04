import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { unlockAdmin } from "@quickpay/server/v1/modules/admin/routes/access";
export const POST = endpoint(async (req) => unlockAdmin(req));
