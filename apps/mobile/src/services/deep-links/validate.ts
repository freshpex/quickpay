const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type AppLink =
  | { kind: "transaction"; id: string }
  | { kind: "reset"; token: string }
  | { kind: "verify"; token?: string }
  | { kind: "referral"; code: string }
  | { kind: "home" };
export function parseAppLink(
  input: string,
  allowedHost?: string,
): AppLink | null {
  try {
    const url = new URL(input);
    if (url.username || url.password || url.hash) return null;
    const custom = url.protocol === "quickpay-dev:";
    if (
      !custom &&
      !(url.protocol === "https:" && allowedHost && url.host === allowedHost)
    )
      return null;
    const path = custom
      ? `/${url.host}${url.pathname}`.replace(/\/$/, "")
      : url.pathname.replace(/\/$/, "");
    if (
      [
        "/mobile/transaction",
        "/mobile/payment-return",
        "/transaction",
        "/payment-return",
      ].includes(path)
    ) {
      const id = url.searchParams.get("id");
      return id && uuid.test(id) ? { kind: "transaction", id } : null;
    }
    if (["/reset-password", "/mobile/reset-password"].includes(path)) {
      const token = url.searchParams.get("token");
      return token && /^[a-zA-Z0-9._-]{16,2048}$/.test(token)
        ? { kind: "reset", token }
        : null;
    }
    if (!custom && path.startsWith("/api/v1/auth/reset-password/")) {
      const token = path.slice("/api/v1/auth/reset-password/".length);
      return /^[a-zA-Z0-9._-]{16,2048}$/.test(token)
        ? { kind: "reset", token }
        : null;
    }
    if (
      [
        "/verify",
        "/mobile/verify",
        ...(!custom ? ["/api/v1/auth/verify-email"] : []),
      ].includes(path)
    ) {
      const token = url.searchParams.get("token");
      return !token
        ? { kind: "verify" }
        : /^[a-zA-Z0-9._-]{16,2048}$/.test(token)
          ? { kind: "verify", token }
          : null;
    }
    if (path === "/sign-in" && url.searchParams.get("verified") === "1")
      return { kind: "verify" };
    if (["/sign-up", "/referral", "/mobile/referral"].includes(path)) {
      const code = url.searchParams.get("ref") || url.searchParams.get("code");
      return code && /^[a-zA-Z0-9_-]{1,32}$/.test(code)
        ? { kind: "referral", code }
        : null;
    }
    return null;
  } catch {
    return null;
  }
}
export function linkRoute(link: AppLink) {
  switch (link.kind) {
    case "transaction":
      return `/(customer)/transactions/${link.id}`;
    case "reset":
      return `/(auth)/reset-password?token=${encodeURIComponent(link.token)}`;
    case "verify":
      return `/(auth)/verify${link.token ? `?token=${encodeURIComponent(link.token)}` : "?verified=1"}`;
    case "referral":
      return `/(auth)/sign-up?ref=${encodeURIComponent(link.code)}`;
    default:
      return "/";
  }
}
export function validTransactionId(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}
