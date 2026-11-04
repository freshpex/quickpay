import { TransactionDetails } from "../../../../features/transactions/TransactionDetails";
export default async function Page({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  return <TransactionDetails id={(await params).transactionId} />;
}
