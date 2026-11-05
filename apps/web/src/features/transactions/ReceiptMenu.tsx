"use client";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { webConnection } from "@quickpay/api-client";
export function ReceiptMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  async function exportFile(format: "pdf" | "png", share: boolean) {
    setOpen(false);
    setBusy(true);
    try {
      const response = await webConnection.fetch(
        `/api/v1/payments/${encodeURIComponent(id)}/receipt?format=${format}`,
        { credentials: "include" },
      );
      if (!response.ok)
        throw new Error(
          "We could not generate your receipt. Please try again.",
        );
      const blob = await response.blob();
      const file = new File([blob], `QuickPay-receipt-${id}.${format}`, {
        type: blob.type,
      });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Quick Pay receipt" });
      } else {
        const url = URL.createObjectURL(file),
          link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        if (share)
          toast.info(
            "File sharing is unavailable in this browser. Your receipt was downloaded instead.",
          );
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        toast.error(
          error instanceof Error ? error.message : "Please try again.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Receipt options"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/20 px-3 text-sm font-bold text-brand"
      >
        <SlidersHorizontal size={19} />
        {busy ? "Preparing…" : "Receipt"}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Receipt exports"
          className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-ink/10 bg-white p-2 shadow-xl"
        >
          {(
            [
              ["Download PDF", "pdf", false],
              ["Download image", "png", false],
              ["Share PDF", "pdf", true],
              ["Share image", "png", true],
            ] as const
          ).map(([label, format, share]) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="block min-h-11 w-full rounded-xl px-4 text-left text-sm hover:bg-paper focus:bg-paper"
              onClick={() => void exportFile(format, share)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
