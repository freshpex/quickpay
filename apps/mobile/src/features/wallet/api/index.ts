import { api } from "../../../services/api";
import type { Wallet, WalletCapabilities } from "@quickpay/contracts";
export const getWallet = () => api<Wallet>("/wallet");
export const getCapabilities = () =>
  api<WalletCapabilities>("/wallet/capabilities");
