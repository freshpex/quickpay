import type { PaymentState, Transaction } from "@quickpay/contracts";
export const statusLabels: Record<PaymentState, string> = {
  created: "Created",
  awaiting_authorization: "Authorization needed",
  processing: "Processing",
  successful: "Successful",
  failed: "Failed",
  reversed: "Reversed",
  cancelled: "Cancelled",
};
export const isPending = (state: PaymentState) =>
  ["created", "awaiting_authorization", "processing"].includes(state);
export function transactionExplanation(t: Transaction) {
  if (isPending(t.status))
    return "We are confirming this transaction. Check its status before starting another payment.";
  if (t.status === "reversed")
    return "This transaction was reversed. Your wallet reflects the confirmed outcome.";
  if (t.status === "successful") return "This transaction has been confirmed.";
  return "Open the details or contact support if you need help with this transaction.";
}
export const localDate = (value: string) =>
  new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
