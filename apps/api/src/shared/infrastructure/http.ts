import { z } from "zod";
import { pool } from "@quickpay/database";
import { ConfigurationError, DomainError, assert } from "../errors";
import { env } from "./env";
export const json = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
export async function rateLimit(key: string, limit = 30) {
  const r = await pool.query(
    "INSERT INTO rate_limits(key,count,reset_at) VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.count+1 END,reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+interval '1 minute' ELSE rate_limits.reset_at END RETURNING count",
    [key],
  );
  assert(
    r.rows[0].count <= limit,
    "RATE_LIMIT",
    "Too many attempts. Please wait a minute.",
    429,
  );
}
export async function body<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<z.infer<T>> {
  const size = req.headers.get("content-length");
  assert(
    !size || Number(size) <= 65536,
    "TOO_LARGE",
    "This request is too large.",
    413,
  );
  const text = await req.text();
  assert(text.length <= 65536, "TOO_LARGE", "This request is too large.", 413);
  try {
    return schema.parse(JSON.parse(text));
  } catch (e) {
    if (e instanceof SyntaxError)
      throw new DomainError(
        "INVALID_JSON",
        "Check the information and try again.",
      );
    throw e;
  }
}
export function endpoint(
  fn: (
    r: Request,
    ctx: { params: Promise<Record<string, string>> },
  ) => Promise<Response>,
  csrf = true,
) {
  return async (
    req: Request,
    ctx: { params: Promise<Record<string, string>> },
  ) => {
    const correlationId = crypto.randomUUID();
    try {
      if (
        csrf &&
        !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        !req.headers.get("authorization")
      ) {
        const origin = req.headers.get("origin");
        assert(
          origin === env().WEB_ORIGIN ||
            origin === env().API_ORIGIN ||
            (!origin &&
              !req.headers.get("cookie") &&
              req.headers.get("content-type")?.startsWith("application/json")),
          "CSRF",
          "Please refresh the page and try again.",
          403,
        );
      }
      const response = await fn(req, ctx);
      response.headers.set("X-Correlation-Id", correlationId);
      return response;
    } catch (e) {
      const known = e instanceof DomainError;
      const invalid = e instanceof z.ZodError;
      const configuration = e instanceof ConfigurationError;
      const status = configuration
        ? 503
        : known
          ? e.status
          : invalid
            ? 422
            : 500;
      if (status >= 500)
        console.error(
          JSON.stringify({
            level: "error",
            correlationId,
            event: "request_failed",
            type: e instanceof Error ? e.name : "unknown",
            path: new URL(req.url).pathname,
            ...(known ? { code: e.code } : {}),
            ...(configuration ? { fields: e.fields } : {}),
          }),
        );
      return json(
        {
          error: {
            code: known ? e.code : invalid ? "VALIDATION" : "UNAVAILABLE",
            message: known
              ? e.message
              : invalid
                ? "Please check the information you entered and try again."
                : "We could not complete this request. Please try again.",
            fields: invalid
              ? z.flattenError(e).fieldErrors
              : known
                ? e.fields
                : undefined,
            correlationId,
          },
        },
        status,
      );
    }
  };
}
