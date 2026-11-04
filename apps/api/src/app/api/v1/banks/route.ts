import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { banks } from "@quickpay/server/v1/modules/withdrawals/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => banks(req), true);
