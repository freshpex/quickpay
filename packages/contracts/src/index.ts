import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
export type {
  Wallet,
  WalletCapability,
  WalletCapabilities,
  ProfileUser,
  Beneficiary,
  InboxNotification,
  NotificationPreferences,
  SupportRequest,
  GiftProduct,
  GiftQuote,
  GiftSale,
  ReferralReward,
  Referrals,
} from "./customer";
export const POLICY_VERSION = "2026-11-04-draft";
export const phone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const raw = value.startsWith("234") ? `+${value}` : value;
    const number = /^[+\d\s().-]+$/.test(raw)
      ? parsePhoneNumberFromString(raw, {
          defaultCountry: "NG",
          extract: false,
        })
      : undefined;
    if (
      !number ||
      number.country !== "NG" ||
      !number.isValid() ||
      number.getType() !== "MOBILE"
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Enter a valid Nigerian mobile number, e.g. 0803 123 4567 or +2348031234567.",
      });
      return z.NEVER;
    }
    return String(number.number);
  });
export const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use no more than 128 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/\d/, "Include a number.");
export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Enter your full name (at least 3 characters).")
      .max(100, "Use no more than 100 characters for your name."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: "Enter a valid email address." }).max(254)),
    phoneNumber: phone,
    password,
    confirmPassword: z.string(),
    referralCode: z.string().trim().max(32).optional(),
    terms: z.literal(true, {
      error: "Accept the Terms and Privacy Policy to continue.",
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Your passwords do not match.",
  });
export const money = z
  .string()
  .regex(/^[1-9]\d{0,11}$/, "Enter a valid amount in kobo.");
export const categories = [
  "airtime",
  "data",
  "electricity",
  "television",
  "internet",
  "education",
  "other",
] as const;
export const states = [
  "created",
  "awaiting_authorization",
  "processing",
  "successful",
  "failed",
  "reversed",
  "cancelled",
] as const;
export type PaymentState = (typeof states)[number];
export const transactionPin = z
  .string()
  .regex(/^\d{6}$/, "Enter your six-digit transaction PIN.");
export const newTransactionPin = transactionPin.refine(
  (v) =>
    !/^(\d)\1{5}$/.test(v) &&
    !"01234567890123456789".includes(v) &&
    !"98765432109876543210".includes(v),
  "Choose a PIN without repeated or sequential digits.",
);
export const paymentSchema = z.object({
  serviceId: z.string().min(1),
  beneficiary: z.string().trim().min(3).max(100),
  amount: money,
  plan: z.string().max(100).optional(),
  phone: phone.optional(),
  validationId: z.string().uuid().optional(),
  pin: transactionPin,
});
export const withdrawalSchema = z.object({
  amount: money,
  bankCode: z.string().regex(/^\d{3,6}$/),
  accountNumber: z.string().regex(/^\d{10}$/),
  validationId: z.string().uuid(),
  pin: transactionPin,
});
export const depositSchema = z.object({ amount: money, pin: transactionPin });
export const rewardRuleSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    enabled: z.boolean(),
    type: z.enum(["fixed", "percentage"]),
    value: z.string().regex(/^\d{1,12}$/),
    recipient: z.enum(["referrer", "referred", "both"]),
    categories: z.array(z.enum(categories)).min(1),
    serviceIds: z.array(z.string()).default([]),
    frequency: z.enum(["first", "recurring"]),
    minimum: money,
    base: z.enum(["payment", "revenue"]),
    maximum: money,
    userCap: money,
    campaignCap: money,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().nullable(),
    holdingHours: z.number().int().min(0).max(2160),
    claimable: z.boolean(),
    withdrawable: z.boolean(),
    effectiveAt: z.iso.datetime(),
  })
  .superRefine((r, c) => {
    if (r.enabled && BigInt(r.value) === 0n)
      c.addIssue({
        code: "custom",
        path: ["value"],
        message: "An enabled campaign needs a reward greater than zero.",
      });
    if (r.type === "percentage" && BigInt(r.value) > 10000n)
      c.addIssue({
        code: "custom",
        path: ["value"],
        message: "Percentage cannot exceed 10,000 basis points.",
      });
    if (r.endsAt && r.endsAt <= r.startsAt)
      c.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must follow start.",
      });
    if (
      BigInt(r.maximum) > BigInt(r.userCap) ||
      BigInt(r.userCap) > BigInt(r.campaignCap)
    )
      c.addIssue({
        code: "custom",
        path: ["maximum"],
        message: "Maximum must fit within user and campaign caps.",
      });
  });
export type RewardRule = z.infer<typeof rewardRuleSchema>;
export function calculateReward(
  rule: RewardRule,
  amount: bigint,
  revenue: bigint,
) {
  if (amount < BigInt(rule.minimum)) return 0n;
  const base = rule.base === "payment" ? amount : revenue;
  const raw =
    rule.type === "fixed"
      ? BigInt(rule.value)
      : (base * BigInt(rule.value)) / 10000n;
  return raw > BigInt(rule.maximum) ? BigInt(rule.maximum) : raw;
}
export function ruleSummary(r: RewardRule) {
  const value =
    r.type === "fixed" ? formatMoney(r.value) : `${Number(r.value) / 100}%`;
  return `${value} ${r.recipient === "both" ? "shared equally between both people" : r.recipient === "referrer" ? "for the inviter" : "for the invited person"} on ${r.frequency === "first" ? "the first" : "each"} qualifying ${r.categories.join(", ")} payment. Minimum ${formatMoney(r.minimum)}. Maximum ${formatMoney(r.maximum)} total per transaction.`;
}
export function parseNaira(input: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(input))
    throw new Error("Enter an amount with up to two decimal places.");
  const [whole, fraction = ""] = input.split(".");
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
}
export function formatMoney(value: string | bigint) {
  const n = BigInt(value);
  const abs = n < 0n ? -n : n;
  return `${n < 0n ? "-" : ""}₦${(abs / 100n).toLocaleString("en-NG")}.${(abs % 100n).toString().padStart(2, "0")}`;
}
export type Service = {
  id: string;
  name: string;
  category: (typeof categories)[number];
  provider: string;
  enabled: boolean;
  available: boolean;
  reason?: string;
  logo?: string;
  min: string;
  max: string;
  fee: string;
  requiresValidation: boolean;
};
export type Transaction = {
  id: string;
  userId: string;
  kind: string;
  status: PaymentState;
  amount: string;
  fee: string;
  currency: string;
  reference: string;
  createdAt: string;
  serviceId: string | null;
  details: Record<string, unknown>;
};
export type ApiError = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    correlationId: string;
  };
};
