import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { referrals } from "@quickpay/server/v1/modules/rewards/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => referrals(req), true);
