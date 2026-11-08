export type GiftPurchase = {
  id: string;
  product_id: string;
  units: string;
  amount: string;
  status: "quoted" | "successful";
  expires_at: string;
  brand?: string;
};
export type GiftPurchaseResult = {
  purchase: GiftPurchase;
  demoCode: string | null;
};
