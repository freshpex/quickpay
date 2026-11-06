import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { emailTemplate } from "./email/template";
import { unseal } from "./security";
import { z } from "zod";
import { env } from "./env";

const emailJob = z.object({
  to: z.email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  otpEncrypted: z.string().optional(),
});
const acceptedMessage = z.object({
  Messages: z.array(z.object({ Status: z.literal("success") })).length(1),
});

// Throw on unconfigured or rejected submissions so the durable worker retries.
// API acceptance is not a claim that the message reached the recipient's inbox.
export async function sendEmail(payload: Record<string, unknown>) {
  const e = env();
  if (!e.MAILJET_API_KEY || !e.MAILJET_SECRET_KEY || !e.MAILJET_FROM_EMAIL) {
    throw new Error("Mailjet email delivery is not configured.");
  }
  const message = emailJob.parse(payload);
  const otp = message.otpEncrypted ? unseal(message.otpEncrypted) : undefined;
  const text = otp ? message.text.replaceAll("{{code}}", otp) : message.text;
  const name =
    "assets/brand/quick-pay-brand-pack-v1/website/header-light@2x.png";
  const logo = await readFile(resolve(process.cwd(), name)).catch(() =>
    readFile(resolve(process.cwd(), "../..", name)),
  );
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${e.MAILJET_API_KEY}:${e.MAILJET_SECRET_KEY}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: e.MAILJET_FROM_EMAIL, Name: e.MAILJET_FROM_NAME },
          To: [{ Email: message.to }],
          Subject: message.subject,
          TextPart: text,
          HTMLPart: emailTemplate({
            subject: message.subject,
            text,
            siteUrl: e.WEB_ORIGIN || "",
            otp,
          }),
          InlinedAttachments: [
            {
              ContentType: "image/png",
              Filename: "quickpay-logo.png",
              ContentID: "quickpay-logo",
              Base64Content: logo.toString("base64"),
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Mailjet rejected email submission.");
  const body: unknown = await response.json();
  if (!acceptedMessage.safeParse(body).success) {
    throw new Error("Mailjet did not accept the email message.");
  }
}
