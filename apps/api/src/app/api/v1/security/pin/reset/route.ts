import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { pinReset } from "@quickpay/server/v1/modules/security/routes/pin";
export const POST = endpoint(pinReset);
