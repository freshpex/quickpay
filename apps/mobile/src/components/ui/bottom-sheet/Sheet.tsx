import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
export function Sheet({open, onClose, children}: {open: boolean; onClose: () => void; children: React.ReactNode}) {
  const ref = useRef<BottomSheetModal>(null);
  useEffect(() => {if (open) ref.current?.present(); else ref.current?.dismiss();}, [open]);
  useEffect(() => {if (!open) return; const sub = BackHandler.addEventListener("hardwareBackPress", () => {onClose(); return true;}); return () => sub.remove();}, [open, onClose]);
  return <BottomSheetModal ref={ref} enablePanDownToClose onDismiss={onClose} keyboardBehavior="interactive" android_keyboardInputMode="adjustResize" backdropComponent={p => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}><BottomSheetView className="gap-4 px-5 pb-12 pt-3">{children}</BottomSheetView></BottomSheetModal>;
}
