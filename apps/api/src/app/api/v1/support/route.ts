import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { support } from "@quickpay/server/v1/modules/support/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => support(req), true);
export const POST = endpoint(async (req, _ctx) => support(req), true);
