import { useState } from "react";
import { Platform, View, Pressable, Text } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { connection } from "../../../services/api/connection";
import { secure } from "../../../services/secure-storage";
import { rawApiUrl } from "../../../lib/config";
import { Notice } from "../../../components/feedback/Feedback";
export function ReceiptMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save(format: "pdf" | "png", share: boolean) {
    setOpen(false);
    setBusy(true);
    setMessage("");
    try {
      const token = await secure.get("token");
      const response = await connection.fetch(
        `${rawApiUrl?.replace(/\/$/, "")}/payments/${encodeURIComponent(id)}/receipt?format=${format}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok)
        throw new Error(
          "We could not generate your receipt. Please try again.",
        );
      const bytes = new Uint8Array(await response.arrayBuffer());
      const name = `QuickPay-receipt-${id}.${format}`,
        mime = format === "pdf" ? "application/pdf" : "image/png";
      if (Platform.OS === "web") {
        const file = new globalThis.File([bytes], name, { type: mime });
        if (share && navigator.canShare?.({ files: [file] }))
          await navigator.share({ files: [file], title: "Quick Pay receipt" });
        else {
          const url = URL.createObjectURL(file),
            link = document.createElement("a");
          link.href = url;
          link.download = name;
          document.body.append(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      } else {
        const file = new File(Paths.document, name);
        file.create({ overwrite: true });
        file.write(bytes);
        if (share && (await Sharing.isAvailableAsync()))
          await Sharing.shareAsync(file.uri, {
            mimeType: mime,
            UTI: format === "pdf" ? "com.adobe.pdf" : "public.png",
            dialogTitle: "Quick Pay receipt",
          });
        else
          setMessage(
            "Receipt downloaded. Choose Share to send it or save a copy outside Quick Pay.",
          );
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setMessage(
          error instanceof Error ? error.message : "Please try again.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View className="items-end gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Receipt options"
        accessibilityState={{ expanded: open, disabled: busy }}
        disabled={busy}
        onPress={() => setOpen(!open)}
        className="min-h-11 flex-row items-center gap-2 rounded-xl border border-line bg-white px-4"
      >
        <SlidersHorizontal size={20} color="#6d28d9" />
        <Text className="font-bold text-violet">
          {busy ? "Preparing…" : "Receipt"}
        </Text>
      </Pressable>
      {open && (
        <View className="w-full rounded-2xl border border-line bg-white p-2">
          {(
            [
              ["Download PDF", "pdf", false],
              ["Download image", "png", false],
              ["Share PDF", "pdf", true],
              ["Share image", "png", true],
            ] as const
          ).map(([label, format, share]) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              onPress={() => void save(format, share)}
              className="min-h-12 justify-center rounded-xl px-4"
            >
              <Text className="text-ink">{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!!message && <Notice>{message}</Notice>}
    </View>
  );
}
