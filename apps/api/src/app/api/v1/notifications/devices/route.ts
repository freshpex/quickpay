import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { devices } from "@quickpay/server/v1/modules/notifications/routes/devices";
export const POST = endpoint(devices);
export const DELETE = endpoint(devices);
