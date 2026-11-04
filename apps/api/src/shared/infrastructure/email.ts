import { z } from "zod";
import { env } from "./env";

const emailJob = z.object({
  to: z.email(),
  subject: z.string().min(1),
  text: z.string().min(1),
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
          TextPart: message.text,
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
