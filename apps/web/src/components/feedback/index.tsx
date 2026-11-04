"use client";
import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";
export function EmptyState({
  title = "Nothing here yet.",
  description = "Your activity will appear here.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 p-10 text-center">
      <Inbox className="mx-auto mb-4 text-brand/50" size={28} />
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/55">{description}</p>
    </div>
  );
}
export function LoadingState() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 p-8 text-sm text-ink/60"
    >
      <LoaderCircle
        className="animate-spin motion-reduce:animate-none"
        size={20}
      />{" "}
      Loading your account…
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <CircleAlert size={19} />
      <p className="flex-1">{message}</p>
      {retry && (
        <button onClick={retry} className="min-h-11 px-3 font-bold underline">
          Try again
        </button>
      )}
    </div>
  );
}
