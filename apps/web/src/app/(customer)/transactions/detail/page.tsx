"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TransactionDetails } from "../../../../features/transactions/TransactionDetails";
function Receipt() {
  const params = useSearchParams();
  const [legacyId, setLegacyId] = useState<string>();
  useEffect(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    if (segments[1] && segments[1] !== "detail")
      setLegacyId(decodeURIComponent(segments[1]));
  }, []);
  const id = params.get("id") || legacyId;
  return id ? <TransactionDetails key={id} id={id} /> : null;
}
export default function Page() {
  return (
    <Suspense>
      <Receipt />
    </Suspense>
  );
}
