import { identity } from "../../../../shared/auth";
import { json } from "../../../../shared/infrastructure/http";
export async function exchanges(req: Request) {
  await identity(req);
  return json({
    pairs: [],
    message:
      "Currency exchanges are not available yet. Supported gift-card sales are quoted in naira in Gift cards.",
  });
}
