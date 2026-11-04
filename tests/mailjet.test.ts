import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const config = vi.hoisted(() => ({
  MAILJET_API_KEY: "test-public-key",
  MAILJET_SECRET_KEY: "test-secret-key",
  MAILJET_FROM_EMAIL: "sender@example.com",
  MAILJET_FROM_NAME: "Quick Pay",
}));
vi.mock("../apps/api/src/shared/infrastructure/env", () => ({
  env: () => config,
}));
import { sendEmail } from "../apps/api/src/shared/infrastructure/email";

const job = {
  to: "customer@example.com",
  subject: "Verify your Quick Pay email",
  text: "Verify your email: https://example.com/verify",
};
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  config.MAILJET_API_KEY = "test-public-key";
  config.MAILJET_SECRET_KEY = "test-secret-key";
  config.MAILJET_FROM_EMAIL = "sender@example.com";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("Mailjet email delivery", () => {
  it("submits the existing verification/reset job content using authenticated Send API v3.1", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ Messages: [{ Status: "success" }] })),
    );
    await sendEmail(job);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.mailjet.com/v3.1/send");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: `Basic ${Buffer.from("test-public-key:test-secret-key").toString("base64")}`,
      "Content-Type": "application/json",
    });
    expect(init?.signal).toBeDefined();
    expect(JSON.parse(String(init?.body))).toEqual({
      Messages: [
        {
          From: { Email: "sender@example.com", Name: "Quick Pay" },
          To: [{ Email: job.to }],
          Subject: job.subject,
          TextPart: job.text,
        },
      ],
    });
  });
  it.each([
    "MAILJET_API_KEY",
    "MAILJET_SECRET_KEY",
    "MAILJET_FROM_EMAIL",
  ] as const)("does not send with missing %s", async (key) => {
    config[key] = "";
    await expect(sendEmail(job)).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects invalid recipients before sending", async () => {
    await expect(sendEmail({ ...job, to: "invalid" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("throws on HTTP rejection so the job is not marked completed", async () => {
    fetchMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    await expect(sendEmail(job)).rejects.toThrow("rejected email submission");
  });
  it.each([{ Messages: [{ Status: "error" }] }, { Messages: [] }, {}])(
    "rejects unsuccessful or missing per-message acceptance: %j",
    async (body) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(body)));
      await expect(sendEmail(job)).rejects.toThrow("did not accept");
    },
  );
  it("propagates timeouts and network failures for the existing retry mechanism", async () => {
    fetchMock.mockRejectedValue(new Error("Network timeout"));
    await expect(sendEmail(job)).rejects.toThrow("Network timeout");
  });
});
