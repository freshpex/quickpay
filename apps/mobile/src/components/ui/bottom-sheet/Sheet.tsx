import { useEffect, useRef } from "react";
import { BackHandler, View, useWindowDimensions } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { InsideSheet } from "./context";
export function Sheet({
  open,
  onClose,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dismissible?: boolean;
}) {
  const ref = useRef<BottomSheetModal>(null);
  const { height } = useWindowDimensions();
  useEffect(() => {
    if (open) ref.current?.present();
    else ref.current?.dismiss();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);
  return (
    <BottomSheetModal
      ref={ref}
      maxDynamicContentSize={height * .88}
      enablePanDownToClose={dismissible}
      onDismiss={onClose}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          pressBehavior={dismissible ? "close" : "none"}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
        />
      )}
    >
      <BottomSheetScrollView keyboardShouldPersistTaps="handled">
        <InsideSheet.Provider value={true}><View className="gap-4 px-5 pb-12 pt-3">{children}</View></InsideSheet.Provider>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
