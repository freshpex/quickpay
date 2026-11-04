export function StatusBadge({ status }: { status: string }) {
  const style = [
    "successful",
    "available",
    "claimed",
    "resolved",
    "paid",
  ].includes(status)
    ? "bg-green-100 text-green-800"
    : ["failed", "rejected", "reversed"].includes(status)
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-900";
  return (
    <span
      role="status"
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${style}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
