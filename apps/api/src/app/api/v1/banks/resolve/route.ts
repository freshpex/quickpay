import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { resolveBank } from "@quickpay/server/v1/modules/withdrawals/routes/handler";
export const runtime = "nodejs";
export const POST = endpoint(async (req, _ctx) => resolveBank(req), true);
