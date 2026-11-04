import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { handleAuth } from "@quickpay/server/v1/modules/auth/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => handleAuth(req), true);
export const POST = endpoint(async (req, _ctx) => handleAuth(req), true);
