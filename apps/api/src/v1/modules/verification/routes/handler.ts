import { identity } from "../../../../shared/auth";
import { json } from "../../../../shared/infrastructure/http";
import { smsConfigured } from "../providers/termii";
export async function capabilities(req: Request) {
  await identity(req);
  return json({
    email: true,
    phone: smsConfigured(),
    identity: false,
    message: "Check your verification options below.",
  });
}
