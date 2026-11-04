import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { adminAccess } from "@quickpay/server/v1/modules/admin/routes/access";
export const GET = endpoint(async (req) => adminAccess(req));
