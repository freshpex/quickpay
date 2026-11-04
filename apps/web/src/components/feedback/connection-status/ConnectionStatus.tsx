"use client";
import { useEffect, useSyncExternalStore } from "react";
import { webConnection, type ConnectionSnapshot } from "@quickpay/api-client";
const initial: ConnectionSnapshot = { phase: "idle" };
export const useConnection = () =>
  useSyncExternalStore(
    webConnection.subscribe,
    webConnection.getSnapshot,
    () => initial,
  );
export function ConnectionStatus() {
  const { phase } = useConnection();
  useEffect(() => {
    const resume = () => {
      webConnection.invalidate();
    };
    window.addEventListener("online", resume);
    return () => window.removeEventListener("online", resume);
  }, []);
  if (["idle", "ready"].includes(phase)) return null;
  const waiting = phase === "connecting" || phase === "slow";
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed inset-x-4 bottom-4 z-[150] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-brand/20 bg-white p-4 text-ink shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      {waiting && (
        <span
          aria-hidden="true"
          className="size-5 shrink-0 rounded-full border-2 border-brand/20 border-t-brand motion-safe:animate-spin"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {phase === "offline"
            ? "You’re offline"
            : waiting
              ? "Securing connection…"
              : "Let’s reconnect"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink/70">
          {phase === "offline"
            ? "Reconnect to the internet, then try again."
            : phase === "slow"
              ? "Taking a little longer. Keep this page open; your details are still here."
              : waiting
                ? "Getting things ready for you. This may take a moment."
                : "Connecting is taking longer than usual. Your details are still here."}
        </p>
      </div>
      {!waiting && (
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-xl bg-brand px-3 text-sm font-bold text-white"
          onClick={() => {
            webConnection.invalidate();
            void webConnection
              .ready()
              .then(() =>
                window.dispatchEvent(new Event("quickpay:connection-restored")),
              )
              .catch(() => {});
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
