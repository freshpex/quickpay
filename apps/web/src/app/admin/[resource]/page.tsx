import { notFound } from "next/navigation";
import { AdminResourcePage } from "../../../features/admin/features/resources/AdminResourcePage";
export default async function Page({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  if (
    ![
      "users",
      "transactions",
      "catalog",
      "gift-products",
      "gifts",
      "exchanges",
      "support",
      "operations",
      "audit",
    ].includes(resource)
  )
    notFound();
  return <AdminResourcePage resource={resource} />;
}

export function generateStaticParams() {
  return [
    "users",
    "transactions",
    "catalog",
    "gift-products",
    "gifts",
    "exchanges",
    "support",
    "operations",
    "audit",
  ].map((resource) => ({ resource }));
}
