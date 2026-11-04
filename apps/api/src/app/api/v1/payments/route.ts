import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { listPayments } from "@quickpay/server/v1/modules/payments/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(async (req, _ctx) => listPayments(req), true);
import { createOperation } from "@quickpay/server/v1/modules/payments/services/create-payment";
export const POST = endpoint(async (req) => createOperation(req, "payment"));
