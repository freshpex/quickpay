import type { PaymentState } from "@quickpay/contracts";
import { assert } from "../../../../shared/errors";
const allowed: Record<PaymentState, PaymentState[]> = {
  created: ["awaiting_authorization", "processing", "cancelled", "failed"],
  awaiting_authorization: ["processing", "cancelled", "failed", "successful"],
  processing: ["successful", "failed", "reversed", "cancelled"],
  successful: ["reversed"],
  failed: [],
  reversed: [],
  cancelled: [],
};
export function transition(from: PaymentState, to: PaymentState) {
  assert(
    from === to || allowed[from]?.includes(to),
    "STATE_CONFLICT",
    "This payment needs a status check before it can change.",
    409,
  );
  return to;
}
