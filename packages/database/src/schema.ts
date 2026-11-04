import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  bigint,
  uniqueIndex,
} from "drizzle-orm/pg-core";
const time = (name: string) => timestamp(name, { withTimezone: true });
export const user = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: time("created_at").notNull().defaultNow(),
  updatedAt: time("updated_at").notNull().defaultNow(),
  phoneNumber: text("phone_number").notNull().unique(),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  policyVersion: text("policy_version").notNull(),
  policyAcceptedAt: time("policy_accepted_at").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  invitedBy: text("invited_by"),
  role: text("role").notNull().default("customer"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
});
export const session = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: time("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: time("created_at").notNull().defaultNow(),
  updatedAt: time("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
export const account = pgTable("auth_accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: time("access_token_expires_at"),
  refreshTokenExpiresAt: time("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: time("created_at").notNull().defaultNow(),
  updatedAt: time("updated_at").notNull().defaultNow(),
});
export const verification = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: time("expires_at").notNull(),
  createdAt: time("created_at").defaultNow(),
  updatedAt: time("updated_at").defaultNow(),
});
export const twoFactor = pgTable("two_factors", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  verified: boolean("verified").default(false),
  failedVerificationCount: integer("failed_verification_count")
    .notNull()
    .default(0),
  lockedUntil: time("locked_until"),
});
export const ledgerAccounts = pgTable("ledger_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id),
  bucket: text("bucket").notNull(),
  balance: bigint("balance", { mode: "bigint" }).notNull().default(0n),
  allowNegative: boolean("allow_negative").notNull().default(false),
});
export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("created"),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    fee: bigint("fee", { mode: "bigint" }).notNull().default(0n),
    currency: text("currency").notNull().default("NGN"),
    reference: text("reference").notNull().unique(),
    provider: text("provider"),
    providerReference: text("provider_reference"),
    serviceId: text("service_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    details: jsonb("details")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("transaction_idempotency").on(t.userId, t.idempotencyKey),
  ],
);
export const catalog = pgTable("service_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  provider: text("provider").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  logo: text("logo"),
  min: bigint("min", { mode: "bigint" }).notNull(),
  max: bigint("max", { mode: "bigint" }).notNull(),
  fee: bigint("fee", { mode: "bigint" }).notNull().default(0n),
  requiresValidation: boolean("requires_validation").notNull().default(false),
});
export const rewardRules = pgTable("reward_rules", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().unique(),
  rule: jsonb("rule").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: time("created_at").notNull().defaultNow(),
});
