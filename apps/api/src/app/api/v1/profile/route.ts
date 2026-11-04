import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { profile } from "@quickpay/server/v1/modules/users/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => profile(req), true);
export const PATCH = endpoint(async (req, _ctx) => profile(req), true);
