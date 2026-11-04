import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { listServices } from "@quickpay/server/v1/modules/billers/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (_req, _ctx) => listServices(), true);
