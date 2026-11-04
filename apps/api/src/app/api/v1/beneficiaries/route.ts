import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { beneficiaries } from "@quickpay/server/v1/modules/users/routes/beneficiaries";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => beneficiaries(req), true);
export const POST = endpoint(async (req, _ctx) => beneficiaries(req), true);
export const DELETE = endpoint(async (req, _ctx) => beneficiaries(req), true);
