import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { api } from "../../../services/api";
export async function chooseEvidence(signal?: AbortSignal) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/jpeg", "image/png"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const file = new File(asset.uri);
  try {
    if (
      !["image/jpeg", "image/png"].includes(asset.mimeType || "") ||
      file.size > 5242880 ||
      file.size === 0
    )
      throw new Error("Choose a JPG or PNG smaller than 5 MB.");
    const data = new FormData();
    data.append("file", {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType,
    } as unknown as Blob);
    return await api<{ id: string; status: string }>("/gift-cards/evidence", {
      method: "POST",
      body: data,
      signal,
    });
  } finally {
    try {
      file.delete();
    } catch {
      /* Temporary cache may already have been removed by the OS. */
    }
  }
}
