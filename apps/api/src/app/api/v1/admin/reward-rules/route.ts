import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { rewardRules } from "@quickpay/server/v1/modules/admin/routes/reward-rules";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => rewardRules(req), true);
export const POST = endpoint(async (req, _ctx) => rewardRules(req), true);
