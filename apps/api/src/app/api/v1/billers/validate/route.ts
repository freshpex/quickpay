import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { validateBeneficiary } from "@quickpay/server/v1/modules/billers/routes/handler";
export const runtime = "nodejs";
export const POST = endpoint(
  async (req, _ctx) => validateBeneficiary(req),
  true,
);
