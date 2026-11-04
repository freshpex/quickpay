import { afterEach, expect, it, vi } from "vitest";
import { api, createApiClient } from "../packages/api-client/src/index";
afterEach(() => vi.unstubAllGlobals());
it("uses the configured native origin, signed bearer and revocation hook without browser cookies", async () => {
  const expired = vi.fn();
  const send = vi.fn().mockResolvedValue(Response.json({error: {code: "UNAUTHENTICATED", message: "Please sign in."}}, {status: 401}));
  const client = createApiClient({baseUrl: "https://api.example/api/v1", getToken: async () => "signed-session", fetcher: send, onUnauthorized: expired});
  await expect(client("/wallet")).rejects.toMatchObject({status: 401});
  expect(send.mock.calls[0][0]).toBe("https://api.example/api/v1/wallet");
  expect(send.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer signed-session");
  expect(send.mock.calls[0][1].credentials).toBe("omit");
  expect(expired).toHaveBeenCalledTimes(1);
  await expect(client("https://evil.example/steal")).rejects.toThrow("relative");
  expect(send).toHaveBeenCalledTimes(1);
});
it("lets the browser supply multipart boundaries for file uploads", async () => {
  const send = vi.fn().mockResolvedValue(Response.json({ id: "uploaded" }));
  vi.stubGlobal("fetch", send);
  const form = new FormData();
  form.set("file", new Blob(["image"], { type: "image/png" }), "evidence.png");
  await api("/gift-cards/evidence", { method: "POST", body: form });
  const options = send.mock.calls[0][1];
  expect(options.body).toBe(form);
  expect(options.headers.has("Content-Type")).toBe(false);
  expect(options.credentials).toBe("include");
});
it("handles non-JSON gateway errors with safe customer text", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("<html>Gateway error</html>", { status: 502 }),
      ),
  );
  await expect(api("/profile")).rejects.toMatchObject({
    status: 502,
    message: "We could not complete this request. Please try again shortly.",
  });
});
it("handles lost connectivity without showing raw fetch errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  await expect(api("/profile")).rejects.toMatchObject({
    status: 0,
    message: expect.stringContaining("Check your internet"),
  });
});
it("preserves field errors and provides a useful message for forms without field mapping", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          error: {
            code: "VALIDATION",
            message: "Check the highlighted information.",
            fields: {
              phoneNumber: ["Enter a valid Nigerian mobile number."],
            },
          },
        },
        { status: 422 },
      ),
    ),
  );
  await expect(api("/auth/sign-up/email")).rejects.toMatchObject({
    message: "Enter a valid Nigerian mobile number.",
    details: {
      fields: { phoneNumber: ["Enter a valid Nigerian mobile number."] },
    },
  });
});
it("normalizes native authentication errors without losing the error code", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password",
        },
        { status: 401 },
      ),
    ),
  );
  await expect(api("/auth/sign-in/email")).rejects.toMatchObject({
    message: "Your email or password is incorrect. Please try again.",
    details: { code: "INVALID_EMAIL_OR_PASSWORD" },
  });
});
