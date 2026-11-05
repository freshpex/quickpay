import * as Crypto from "expo-crypto";
import { onlineManager } from "@tanstack/react-query";
import { mutation } from "@quickpay/api-client";
import type { Transaction } from "@quickpay/contracts";
import { api } from "../../../services/api";
import { secure } from "../../../services/secure-storage";
import { OperationCoordinator, type PendingOperation } from "./operation";
export const loadPending = async (): Promise<PendingOperation | null> =>
  JSON.parse((await secure.get("pending")) || "null");
export const savePending = (value: PendingOperation | null) =>
  value
    ? secure.set("pending", JSON.stringify(value))
    : secure.remove("pending");
export const operations = new OperationCoordinator({
  load: loadPending,
  save: savePending,
  online: () => onlineManager.isOnline(),
  uuid: () => Crypto.randomUUID(),
  recover: async (key) =>
    (
      await api<{ transaction: Transaction | null }>(
        `/payments/by-key/${encodeURIComponent(key)}`,
      )
    ).transaction,
  send: async (p, pin) =>
    (
      await api<{ transaction: Transaction }>(
        p.kind === "deposit"
          ? "/deposits"
          : p.kind === "withdrawal"
            ? "/withdrawals"
            : "/payments",
        mutation({ ...p.body, ...(pin ? { pin } : {}) }, p.key),
      )
    ).transaction,
});
