import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import { preferences } from "@quickpay/server/v1/modules/notifications/routes/devices";
export const GET = endpoint(preferences);
export const PATCH = endpoint(preferences);
