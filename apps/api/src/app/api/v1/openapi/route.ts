import { openapi } from "@quickpay/server/shared/infrastructure/openapi";
import { json } from "@quickpay/server/shared/infrastructure/http";
export async function GET() {
  return json(openapi());
}
