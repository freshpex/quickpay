"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function Modal({
  title,
  description,
  open,
  onClose,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-deep/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl">
          <Dialog.Title className="pr-10 text-xl font-bold">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mb-6 mt-2 text-sm leading-relaxed text-ink/60">
            {description}
          </Dialog.Description>
          <Dialog.Close
            aria-label="Close dialog"
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-xl hover:bg-ink/5"
          >
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
