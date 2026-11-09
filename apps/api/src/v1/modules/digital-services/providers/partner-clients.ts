import { createHmac, timingSafeEqual } from "node:crypto";
import { DomainError } from "../../../../shared/errors";
import { supplierEndpoint, supplierSettings } from "./config";

type Fields = Record<string, string>;
async function responseJson(response: Response): Promise<unknown> {
  if (!response.ok)
    throw new DomainError(
      "PROVIDER_UNAVAILABLE",
      "The service could not complete this request. Check its status before retrying.",
      503,
    );
  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    ("success" in data && data.success === false)
  )
    throw new DomainError(
      "PROVIDER_REJECTED",
      "The service could not complete this request.",
      409,
    );
  return data;
}
function requireCredentials(...values: string[]) {
  if (values.some((value) => !value))
    throw new DomainError(
      "PROVIDER_UNCONFIGURED",
      "This service is currently unavailable.",
      503,
    );
}
export function prestmitSignature(key: string, secret: string, fields: Fields) {
  return createHmac("sha256", secret)
    .update(`${key}:${JSON.stringify(fields)}`)
    .digest("hex");
}
export function validPrestmitWebhook(
  rawBody: string,
  signature: string | null,
  secret: string,
) {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  const received = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return received.length === wanted.length && timingSafeEqual(received, wanted);
}
async function prestmitGet(path: string, fields: Fields = {}) {
  const config = supplierSettings();
  requireCredentials(config.PRESTMIT_API_KEY, config.PRESTMIT_API_SECRET);
  const url = new URL(
    `${supplierEndpoint("prestmit", config.PAYMENT_MODE)}${path}`,
  );
  for (const [key, value] of Object.entries(fields))
    url.searchParams.set(key, value);
  return responseJson(
    await fetch(url, {
      headers: {
        "API-KEY": config.PRESTMIT_API_KEY,
        "API-Hash": prestmitSignature(
          config.PRESTMIT_API_KEY,
          config.PRESTMIT_API_SECRET,
          fields,
        ),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(20000),
      redirect: "error",
    }),
  );
}
export const prestmit = {
  availability: () => prestmitGet("/general/service-availability"),
  buyCatalog: (page = "1") =>
    prestmitGet("/giftcard-trade/buy/fetch-buyable-giftcards", { page }),
  buyConfiguration: () => prestmitGet("/giftcard-trade/buy/config"),
  sellRates: () => prestmitGet("/giftcard-trade/sell/rate-calculator-data"),
  wallet: () => prestmitGet("/wallet/fiat/details"),
};
export async function fincraQuote(
  sourceCurrency: "NGN" | "USD" | "EUR" | "GBP",
  destinationCurrency: "NGN" | "USD" | "EUR" | "GBP",
  amount: string,
) {
  if (
    sourceCurrency === destinationCurrency ||
    !/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(amount) ||
    Number(amount) <= 0
  )
    throw new DomainError(
      "INVALID_AMOUNT",
      "Choose different currencies and a positive amount.",
      400,
    );
  const config = supplierSettings();
  requireCredentials(config.FINCRA_SECRET_KEY, config.FINCRA_BUSINESS_ID);
  return responseJson(
    await fetch(
      `${supplierEndpoint("fincra", config.PAYMENT_MODE)}/quotes/generate`,
      {
        method: "POST",
        headers: {
          "api-key": config.FINCRA_SECRET_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sourceCurrency,
          destinationCurrency,
          amount,
          business: config.FINCRA_BUSINESS_ID,
          action: "send",
          transactionType: "conversion",
          paymentDestination: "fliqpay_wallet",
        }),
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      },
    ),
  );
}
