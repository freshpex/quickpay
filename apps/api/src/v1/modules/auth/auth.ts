import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, twoFactor } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db, schema, pool, enqueue } from "@quickpay/database";
import { env } from "../../../shared/infrastructure/env";
const e = () => env();
let instance: ReturnType<typeof createAuth> | undefined;
function createAuth() {
  return betterAuth({
    appName: "Quick Pay",
    secret: e().BETTER_AUTH_SECRET,
    baseURL: e().WEB_ORIGIN,
    basePath: "/api/v1/auth",
    trustedOrigins: [e().WEB_ORIGIN, e().API_ORIGIN, "quickpay-dev://"],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await enqueue(
          pool,
          "email",
          {
            to: user.email,
            subject: "Reset your Quick Pay password",
            text: `Reset your password: ${url}`,
          },
          `reset:${crypto.randomUUID()}`,
        );
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => {
        await enqueue(
          pool,
          "email",
          {
            to: user.email,
            subject: "Verify your Quick Pay email",
            text: `Verify your email: ${url}`,
          },
          `verify:${crypto.randomUUID()}`,
        );
      },
    },
    user: {
      additionalFields: {
        phoneNumber: { type: "string", required: true },
        phoneVerified: { type: "boolean", defaultValue: false, input: false },
        policyVersion: { type: "string", required: true },
        policyAcceptedAt: { type: "date", required: true },
        referralCode: { type: "string", required: true },
        invitedBy: { type: "string", required: false, input: false },
        role: { type: "string", defaultValue: "customer", input: false },
        permissions: { type: "string[]", defaultValue: [], input: false },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 12 },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    rateLimit: { enabled: true, window: 60, max: 30 },
    plugins: [expo(), bearer(), twoFactor({ issuer: "Quick Pay" })],
  });
}
export function auth() {
  return (instance ??= createAuth());
}
