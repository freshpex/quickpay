import { useSyncExternalStore } from "react";
import { connection } from "./connection";
export const useConnection = () =>
  useSyncExternalStore(
    connection.subscribe,
    connection.getSnapshot,
    connection.getSnapshot,
  );
