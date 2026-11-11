import { z } from "zod";
import { ConfigurationError, DomainError } from "../../../../shared/errors";

const basisPoints = (value: number) =>
  z.coerce.number().int().min(0).max(10000).default(value);
const schema = z.object({
  PAYMENT_MODE: z.enum(["disabled", "sandbox", "live"]).default("disabled"),
  PRESTMIT_API_KEY: z.string().trim().default(""),
  PRESTMIT_API_SECRET: z.string().trim().default(""),
  PRESTMIT_WEBHOOK_SECRET: z.string().trim().default(""),
  FINCRA_SECRET_KEY: z.string().trim().default(""),
  FINCRA_BUSINESS_ID: z.string().trim().default(""),
  FINCRA_WEBHOOK_SECRET: z.string().trim().default(""),
  GIFT_BUY_MARKUP_BPS: basisPoints(300),
  GIFT_SELL_MARGIN_BPS: basisPoints(200),
  VIRTUAL_NUMBER_MARKUP_BPS: basisPoints(2000),
  SOCIAL_BOOST_MARKUP_BPS: basisPoints(3000),
  EXCHANGE_MARKUP_BPS: basisPoints(100),
});
export function supplierSettings(
  values: Record<string, string | undefined> = process.env,
) {
  const parsed = schema.safeParse(values);
  if (!parsed.success)
    throw new ConfigurationError([
      ...new Set(parsed.error.issues.map((issue) => String(issue.path[0]))),
    ]);
  return parsed.data;
}
export function supplierEndpoint(
  provider: "prestmit" | "fincra",
  mode: "disabled" | "sandbox" | "live",
) {
  if (mode === "disabled")
    throw new DomainError(
      "SERVICE_UNAVAILABLE",
      "This service is currently unavailable.",
      503,
    );
  if (provider === "prestmit")
    return mode === "live"
      ? "https://api.prestmit.io/partners/v1"
      : "https://dev-api.prestmit.io/partners/v1";
  return mode === "live"
    ? "https://api.fincra.com"
    : "https://sandboxapi.fincra.com";
}
export function markedUpCost(costMinor: bigint, markupBps: number) {
  if (
    costMinor <= 0n ||
    !Number.isInteger(markupBps) ||
    markupBps < 0 ||
    markupBps > 10000
  )
    throw new Error("Invalid price parameters");
  return (costMinor * BigInt(10000 + markupBps) + 9999n) / 10000n;
}
