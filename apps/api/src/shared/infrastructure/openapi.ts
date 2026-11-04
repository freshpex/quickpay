import { z } from "zod";
import { rewardRuleSchema } from "@quickpay/contracts";
import { financialSchemas } from "../../v1/modules/payments/docs/payments.openapi";
type Operation = {
  summary: string;
  tags: string[];
  security?: unknown[];
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
};
const success = {
  description:
    "Request accepted. Response fields are documented in docs/API.md.",
  content: { "application/json": { schema: { type: "object" } } },
};
const error = {
  description: "Safe request error",
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" } },
  },
};
export function openapi() {
  const paths: Record<string, Record<string, Operation>> = {};
  const add = (
    path: string,
    method: string,
    summary: string,
    tag: string,
    request?: unknown,
    publicAccess = false,
    idempotency = false,
  ) => {
    const parameters: unknown[] = [...path.matchAll(/\{([^}]+)\}/g)].map(
      (m) => ({
        in: "path",
        name: m[1],
        required: true,
        schema: { type: "string" },
      }),
    );
    if (idempotency)
      parameters.push({
        in: "header",
        name: "Idempotency-Key",
        required: true,
        schema: { type: "string", minLength: 16, maxLength: 100 },
        description:
          "Scoped to the authenticated user; reuse only with identical request details.",
      });
    const op: Operation = {
      summary,
      tags: [tag],
      security: publicAccess ? [] : [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters,
      responses: {
        "200": success,
        "201": success,
        "202": success,
        "400": error,
        "401": error,
        "403": error,
        "404": error,
        "409": error,
        "422": error,
        "429": error,
        "503": error,
      },
    };
    if (request)
      op.requestBody = {
        required: true,
        content: { "application/json": { schema: request } },
      };
    (paths[path] ??= {})[method] = op;
  };
  const object = (
    properties: Record<string, unknown>,
    required = Object.keys(properties),
  ) => ({ type: "object", properties, required });
  const str = { type: "string" };
  add(
    "/wallet/capabilities",
    "get",
    "Read wallet availability, deposit methods, exact kobo fees and limits",
    "Wallet",
  );
  add(
    "/payments/by-key/{key}",
    "get",
    "Recover an owned operation by idempotency key; transaction is null when absent",
    "Payments",
  );
  add(
    "/notifications/preferences",
    "get",
    "Read push availability and account preference",
    "Notifications",
  );
  add(
    "/notifications/preferences",
    "patch",
    "Set push preference; inbox stays enabled",
    "Notifications",
    object({ pushEnabled: { type: "boolean" } }),
  );
  add(
    "/notifications/devices",
    "post",
    "Register/reassign this authenticated installation; encrypted push token",
    "Notifications",
    object({
      installationId: { type: "string", format: "uuid" },
      token: { type: "string", maxLength: 256, writeOnly: true },
      platform: { enum: ["ios", "android"] },
    }),
  );
  add(
    "/notifications/devices",
    "delete",
    "Revoke only an owned installation",
    "Notifications",
    object({ installationId: { type: "string", format: "uuid" } }),
  );
  add(
    "/auth/sign-up/email",
    "post",
    "Create account and queue contact verification",
    "Auth",
    object(
      {
        name: str,
        email: { type: "string", format: "email" },
        phoneNumber: str,
        password: { type: "string", minLength: 12, writeOnly: true },
        confirmPassword: { type: "string", writeOnly: true },
        referralCode: str,
        terms: { const: true },
      },
      ["name", "email", "phoneNumber", "password", "confirmPassword", "terms"],
    ),
    true,
  );
  add(
    "/auth/sign-in/email",
    "post",
    "Sign in; MFA may be required",
    "Auth",
    object({ email: str, password: { type: "string", writeOnly: true } }),
    true,
  );
  add(
    "/auth/get-session",
    "get",
    "Read current identity",
    "Auth",
    undefined,
    true,
  );
  add("/auth/sign-out", "post", "Revoke current session", "Auth", object({}));
  add(
    "/auth/request-password-reset",
    "post",
    "Request a reset email",
    "Auth",
    object({ email: str }),
    true,
  );
  add(
    "/auth/reset-password",
    "post",
    "Consume password reset token",
    "Auth",
    object({ token: str, newPassword: { type: "string", writeOnly: true } }),
    true,
  );
  add(
    "/auth/change-password",
    "post",
    "Change password and revoke other sessions",
    "Auth",
    object({
      currentPassword: { type: "string", writeOnly: true },
      newPassword: { type: "string", writeOnly: true },
      revokeOtherSessions: { type: "boolean" },
    }),
  );
  add(
    "/auth/send-verification-email",
    "post",
    "Resend email verification",
    "Auth",
    object({ email: str, callbackURL: str }),
    true,
  );
  add(
    "/auth/verify-email",
    "get",
    "Consume signed email token",
    "Auth",
    undefined,
    true,
  );
  add(
    "/auth/two-factor/enable",
    "post",
    "Begin authenticator setup",
    "Auth",
    object({ password: { type: "string", writeOnly: true } }),
  );
  add(
    "/auth/two-factor/verify-totp",
    "post",
    "Verify authenticator code",
    "Auth",
    object({ code: str }),
    true,
  );
  add(
    "/wallet",
    "get",
    "Read available, reserved, reward and debt buckets",
    "Wallets",
  );
  add(
    "/payments",
    "get",
    "List owned transactions, cursor pagination",
    "Payments",
  );
  add(
    "/payments",
    "post",
    "Reserve and queue a bill payment",
    "Payments",
    { $ref: "#/components/schemas/Payment" },
    false,
    true,
  );
  add(
    "/payments/{paymentId}",
    "get",
    "Read owned transaction and receipt",
    "Payments",
  );
  add(
    "/payments/{paymentId}/check",
    "post",
    "Queue authenticated provider reconciliation",
    "Payments",
    object({}),
  );
  add(
    "/deposits",
    "post",
    "Prepare hosted checkout asynchronously",
    "Deposits",
    { $ref: "#/components/schemas/Deposit" },
    false,
    true,
  );
  add(
    "/withdrawals",
    "post",
    "Reserve and queue verified bank transfer",
    "Withdrawals",
    { $ref: "#/components/schemas/Withdrawal" },
    false,
    true,
  );
  add("/banks", "get", "Load provider-supported Nigerian banks", "Withdrawals");
  add(
    "/banks/resolve",
    "post",
    "Verify bank destination for ten minutes",
    "Withdrawals",
    object({ accountNumber: str, bankCode: str }),
  );
  add(
    "/catalog",
    "get",
    "List catalog and configuration-derived availability",
    "Billers",
    undefined,
    true,
  );
  add(
    "/catalog/{serviceId}/plans",
    "get",
    "Read current provider plans",
    "Billers",
  );
  add(
    "/billers/validate",
    "post",
    "Verify recipient before payment",
    "Billers",
    object(
      {
        serviceId: str,
        beneficiary: str,
        type: { enum: ["prepaid", "postpaid"] },
      },
      ["serviceId", "beneficiary"],
    ),
  );
  add(
    "/webhooks/paystack",
    "post",
    "Authenticate raw-body HMAC-SHA512 and deduplicate event",
    "Webhooks",
    object({ event: str, data: { type: "object" } }),
    true,
  );
  paths["/webhooks/paystack"].post.parameters = [
    {
      in: "header",
      name: "x-paystack-signature",
      required: true,
      schema: { type: "string" },
    },
  ];
  add(
    "/referrals",
    "get",
    "Read invitation code and versioned reward history",
    "Referrals",
  );
  add(
    "/rewards/active-rule",
    "get",
    "Read active public campaign summary",
    "Rewards",
    undefined,
    true,
  );
  add(
    "/rewards/{rewardId}/claim",
    "post",
    "Claim an eligible reward once",
    "Rewards",
    object({ password: { type: "string", writeOnly: true } }),
  );
  add(
    "/gift-cards/products",
    "get",
    "Read enabled selling products; buying remains unavailable",
    "Gift cards",
  );
  add(
    "/gift-cards/quotes",
    "post",
    "Create immutable ten-minute naira quote",
    "Gift cards",
    object({ productId: str, units: str }),
  );
  add(
    "/gift-cards/evidence",
    "post",
    "Upload private quarantined JPG/PNG up to 5 MB",
    "Gift cards",
  );
  paths["/gift-cards/evidence"].post.requestBody = {
    required: true,
    content: {
      "multipart/form-data": {
        schema: object({ file: { type: "string", format: "binary" } }),
      },
    },
  };
  add(
    "/gift-cards/evidence/{evidenceId}",
    "get",
    "Download clean evidence with owner or review permission",
    "Gift cards",
  );
  add(
    "/gift-cards/sales",
    "get",
    "List owned gift-card reviews and settlement states",
    "Gift cards",
  );
  add(
    "/gift-cards/sales",
    "post",
    "Submit unused unexpired quote and owned evidence",
    "Gift cards",
    object({ quoteId: str, evidenceId: str }),
  );
  add("/exchanges", "get", "Read supported exchange capabilities", "Exchanges");
  add("/profile", "get", "Read owned profile and policy acceptance", "Users");
  add(
    "/profile",
    "patch",
    "Update display name",
    "Users",
    object({ name: str }),
  );
  add("/beneficiaries", "get", "List owned saved recipients", "Users");
  add(
    "/beneficiaries",
    "post",
    "Save recipient",
    "Users",
    object({
      name: str,
      kind: { enum: ["phone", "bill"] },
      details: object({ account: str, serviceId: str }, ["account"]),
    }),
  );
  add(
    "/beneficiaries",
    "delete",
    "Remove owned beneficiary",
    "Users",
    object({ id: str }),
  );
  add("/notifications", "get", "Read owned notifications", "Notifications");
  add(
    "/notifications",
    "patch",
    "Mark owned notification read",
    "Notifications",
    object({ id: str }),
  );
  add("/support", "get", "Read owned support requests", "Support");
  add(
    "/support",
    "post",
    "Open support request",
    "Support",
    object({ subject: str, message: str, transactionId: str }, [
      "subject",
      "message",
    ]),
  );
  add(
    "/admin/reward-rules",
    "get",
    "Read campaign versions, requires rewards.read and MFA",
    "Admin",
  );
  add(
    "/admin/reward-rules",
    "post",
    "Append validated audited campaign version",
    "Admin",
    { $ref: "#/components/schemas/RewardRule" },
  );
  for (const resource of [
    "users",
    "transactions",
    "catalog",
    "gift-products",
    "gifts",
    "exchanges",
    "support",
    "operations",
    "audit",
  ])
    add(
      `/admin/${resource}`,
      "get",
      `Read ${resource}; explicit permission and MFA required`,
      "Admin",
    );
  for (const resource of [
    "catalog",
    "gift-products",
    "gifts",
    "support",
    "operations",
  ])
    add(
      `/admin/${resource}`,
      "patch",
      `Update ${resource}; see docs/API.md for action schema and permission`,
      "Admin",
      { type: "object", additionalProperties: true },
    );
  add(
    "/verification/capabilities",
    "get",
    "Read configured email, phone and identity capabilities",
    "Verification",
  );
  add(
    "/verification/phone/send",
    "post",
    "Send an OTP to the owned stored Nigerian phone",
    "Verification",
    object({}),
  );
  add(
    "/verification/phone/verify",
    "post",
    "Verify owned one-use phone challenge",
    "Verification",
    object({ id: str, code: str }),
  );
  add(
    "/gift-cards/purchases",
    "post",
    "Buying capability is unavailable pending supplier setup",
    "Gift cards",
    object({}),
  );
  add(
    "/admin/access",
    "get",
    "Read session elevation and MFA enrollment state",
    "Admin",
  );
  add(
    "/admin/unlock",
    "post",
    "Confirm authenticator for a 15-minute admin elevation",
    "Admin",
    object({ code: str }),
  );
  add(
    "/health",
    "get",
    "Database readiness and payment mode",
    "Operations",
    undefined,
    true,
  );
  return {
    openapi: "3.1.0",
    info: {
      title: "Quick Pay API",
      version: "1.0.0",
      description:
        "NGN integer kobo. UTC storage, Africa/Lagos presentation. Browser requests use same-origin cookies and Origin checks; mobile uses bearer sessions. Financial mutations require idempotency. Unknown provider outcomes remain pending.",
    },
    servers: [{ url: "/api/v1" }],
    paths,
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
        },
        bearerAuth: { type: "http", scheme: "bearer" },
      },
      schemas: {
        ...financialSchemas,
        RewardRule: z.toJSONSchema(rewardRuleSchema),
        Error: {
          type: "object",
          properties: {
            error: object(
              {
                code: str,
                message: str,
                correlationId: str,
                fields: { type: "object" },
              },
              ["code", "message", "correlationId"],
            ),
          },
        },
      },
    },
  };
}
