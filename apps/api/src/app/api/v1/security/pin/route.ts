import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { pinSettings } from "@quickpay/server/v1/modules/security/routes/pin";
export const GET = endpoint(pinSettings);
export const POST = endpoint(pinSettings);
