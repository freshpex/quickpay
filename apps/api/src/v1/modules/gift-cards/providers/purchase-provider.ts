import { DomainError } from "../../../../shared/errors";
/** Supplier-neutral boundary. No live buying capability is registered without verified supplier access. */
export interface GiftCardPurchaseProvider {
  catalog(): Promise<
    {
      id: string;
      brand: string;
      region: string;
      denominations: string[];
      currency: string;
    }[]
  >;
  quote(
    productId: string,
    faceValue: string,
  ): Promise<{ supplierReference: string; costKobo: string; expiresAt: Date }>;
  purchase(
    quoteReference: string,
    internalReference: string,
  ): Promise<{
    reference: string;
    status: "processing" | "successful" | "failed";
  }>;
  verify(reference: string): Promise<{
    reference: string;
    status: "processing" | "successful" | "failed" | "reversed";
    costKobo: string;
    currency: "NGN";
    encryptedFulfillment?: string;
  }>;
}
class UnconfiguredPurchaseProvider implements GiftCardPurchaseProvider {
  private unavailable(): never {
    throw new DomainError(
      "GIFT_PURCHASE_UNAVAILABLE",
      "Gift-card buying is not available yet. Please check back.",
      503,
    );
  }
  async catalog(): ReturnType<GiftCardPurchaseProvider["catalog"]> {
    return this.unavailable();
  }
  async quote(
    _productId: string,
    _faceValue: string,
  ): ReturnType<GiftCardPurchaseProvider["quote"]> {
    return this.unavailable();
  }
  async purchase(
    _quoteReference: string,
    _internalReference: string,
  ): ReturnType<GiftCardPurchaseProvider["purchase"]> {
    return this.unavailable();
  }
  async verify(
    _reference: string,
  ): ReturnType<GiftCardPurchaseProvider["verify"]> {
    return this.unavailable();
  }
}
export const giftCardBuyer: GiftCardPurchaseProvider =
  new UnconfiguredPurchaseProvider();
