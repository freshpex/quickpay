import { validTransactionId } from "./validate";
let transactionId: string | null = null;
export function deferTransaction(id: unknown) {
  if (validTransactionId(id)) transactionId = id;
}
export function consumeDestination():
  | `/(customer)/transactions/${string}`
  | "/(customer)/(tabs)" {
  const id = transactionId;
  transactionId = null;
  return id ? `/(customer)/transactions/${id}` : "/(customer)/(tabs)";
}
