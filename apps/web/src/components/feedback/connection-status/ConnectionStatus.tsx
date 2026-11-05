"use client";
import { useSyncExternalStore } from "react";
import { webConnection, type ConnectionSnapshot } from "@quickpay/api-client";
const initial: ConnectionSnapshot = { phase: "idle" };
export const useConnection = () =>
  useSyncExternalStore(
    webConnection.subscribe,
    webConnection.getSnapshot,
    () => initial,
  );
