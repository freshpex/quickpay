import type { ApiError } from "@quickpay/contracts";
const authMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD:
    "Your email or password is incorrect. Please try again.",
  EMAIL_NOT_VERIFIED:
    "Verify your email before signing in. Open the link in your verification email.",
  USER_ALREADY_EXISTS:
    "An account with this email already exists. Sign in or reset your password.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account with this email already exists. Sign in or reset your password.",
  INVALID_TOKEN:
    "This link is invalid or has expired. Please request a new one.",
  TOKEN_EXPIRED: "This link has expired. Please request a new one.",
  INVALID_PASSWORD: "Your current password is incorrect. Please try again.",
};
export class ApiFailure extends Error {
  constructor(
    public status: number,
    public details: ApiError["error"],
  ) {
    super(details.message);
  }
}
export type ClientOptions = {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
  onResponse?: (response: Response) => void | Promise<void>;
  onUnauthorized?: () => void | Promise<void>;
  credentials?: RequestCredentials;
};
export function createApiClient(config: ClientOptions) {
  return <T>(path: string, options: RequestInit = {}) => request<T>(path, options, config);
}
async function request<T>(
  path: string,
  options: RequestInit = {},
  config: ClientOptions,
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://"))
    throw new Error("API paths must be relative to the configured API.");
  const headers = new Headers(options.headers);
  const token = await config.getToken?.();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  let r: Response;
  try {
    r = await fetch(`${config.baseUrl.replace(/\/$/, "")}${path}`, {
      credentials: config.credentials ?? "omit",
      ...options,
      headers,
    });
  } catch {
    throw new ApiFailure(0, {
      code: "CONNECTION",
      message:
        "We could not connect. Check your internet connection and try again.",
      correlationId: "",
    });
  }
  await config.onResponse?.(r);
  if (r.status === 401 && token) await config.onUnauthorized?.();
  const body = await r.json().catch(() => null);
  if (!r.ok) {
    const error =
      body?.error && typeof body.error === "object" ? body.error : body;
    const code =
      typeof error?.code === "string" ? error.code : "REQUEST_FAILED";
    const fields: Record<string, string[]> | undefined =
      error?.fields && typeof error.fields === "object"
        ? Object.fromEntries(
            Object.entries(error.fields).filter(
              (entry): entry is [string, string[]] =>
                Array.isArray(entry[1]) &&
                entry[1].every((item) => typeof item === "string"),
            ),
          )
        : undefined;
    const firstField = fields && Object.values(fields).flat()[0];
    throw new ApiFailure(r.status, {
      code,
      message:
        r.status >= 500
          ? "We could not complete this request. Please try again shortly."
          : r.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : authMessages[code] ||
              firstField ||
              (typeof error?.message === "string"
                ? error.message
                : "We could not complete this request. Please try again."),
      fields,
      correlationId:
        typeof error?.correlationId === "string"
          ? error.correlationId
          : r.headers.get("X-Correlation-Id") || "",
    });
  }
  if (r.status !== 204 && body === null)
    throw new ApiFailure(r.status, {
      code: "INVALID_RESPONSE",
      message:
        "We could not load this information. Please refresh and try again.",
      correlationId: "",
    });
  return body as T;
}
export const api = createApiClient({baseUrl: "/api/v1", credentials: "include"});
export const mutation = (body: unknown, key?: string): RequestInit => ({
  method: "POST",
  headers: key ? { "Idempotency-Key": key } : {},
  body: JSON.stringify(body),
});
