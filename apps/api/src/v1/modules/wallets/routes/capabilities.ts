import { identity } from "../../../../shared/auth";
import { json } from "../../../../shared/infrastructure/http";
import { env } from "../../../../shared/infrastructure/env";
import { paystackConfigured } from "../../deposits/providers/paystack";
import { walletLimits } from "../domain/limits";
export async function walletCapabilities(req: Request) {
  await identity(req);
  const deposit = paystackConfigured();
  const withdrawal = deposit && env().PAYSTACK_TRANSFERS_ENABLED === "true";
  return json({currency: "NGN", deposit: {...walletLimits, available: deposit, methods: deposit ? [{id: "hosted", name: "Secure checkout"}] : [], reason: deposit ? null : "Adding money is currently unavailable. Please check back."}, withdrawal: {...walletLimits, available: withdrawal, reason: withdrawal ? null : "Bank withdrawals are currently unavailable. Please check back."}});
}
