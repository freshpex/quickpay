import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
type Deposit = {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  customer: { email: string };
  status: string;
  callback: string;
};
export function providerGateway(options: {
  secret: string;
  apiOrigin: string;
}) {
  const deposits = new Map<string, Deposit>(),
    transfers = new Map<
      string,
      {
        reference: string;
        amount: number;
        recipient: { recipient_code: string };
        status: string;
        currency: string;
      }
    >(),
    bills = new Map<
      string,
      {
        request_id: string;
        amount: string;
        unique_element: string;
        status: string;
      }
    >();
  const counts = {
    initializations: 0,
    bankResolves: 0,
    verifications: 0,
    transfers: 0,
    bills: 0,
    emails: 0,
  };
  const emails: {
    to: string;
    subject: string;
    text: string;
    branded: boolean;
  }[] = [];
  return createServer(async (req, res) => {
    const url = new URL(req.url!, "http://127.0.0.1:3190");
    const json = (value: unknown, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    if (
      url.pathname.startsWith("/paystack/") &&
      req.headers.authorization !== `Bearer ${options.secret}`
    ) {
      json({ status: false }, 401);
      return;
    }
    if (
      url.pathname.startsWith("/vtpass/") &&
      (req.headers["api-key"] !== "qa-fixture" ||
        req.headers[req.method === "GET" ? "public-key" : "secret-key"] !==
          "qa-fixture")
    ) {
      json({ code: "011" }, 401);
      return;
    }
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const text = Buffer.concat(chunks).toString();
      if (text && req.headers["content-type"]?.includes("application/json"))
        body = JSON.parse(text);
    }
    if (url.pathname === "/__qa/stats") {
      json(counts);
      return;
    }
    if (url.pathname === "/__qa/mail") {
      json(emails);
      return;
    }
    if (url.pathname === "/mailjet/v3.1/send") {
      const messages = body.Messages as {
        To: { Email: string }[];
        Subject: string;
        TextPart: string;
        HTMLPart: string;
        InlinedAttachments?: { ContentID: string; Base64Content: string }[];
      }[];
      for (const message of messages)
        emails.push({
          to: message.To[0].Email,
          subject: message.Subject,
          text: message.TextPart,
          branded:
            message.HTMLPart.includes("cid:quickpay-logo") &&
            !!message.InlinedAttachments?.some(
              (attachment) =>
                attachment.ContentID === "quickpay-logo" &&
                !!attachment.Base64Content,
            ),
        });
      counts.emails += messages.length;
      json({ Messages: messages.map(() => ({ Status: "success" })) });
      return;
    }
    if (url.pathname.startsWith("/__qa/checkout/")) {
      const reference = decodeURIComponent(
        url.pathname.slice("/__qa/checkout/".length),
      );
      const record = deposits.get(reference);
      if (!record) {
        json({ error: "Unknown QA checkout" }, 404);
        return;
      }
      record.status = "success";
      const event = JSON.stringify({
        event: "charge.success",
        data: { id: record.id, reference, amount: record.amount },
      });
      const response = await fetch(
        `${options.apiOrigin}/api/v1/webhooks/paystack`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-paystack-signature": createHmac("sha512", options.secret)
              .update(event)
              .digest("hex"),
          },
          body: event,
        },
      );
      if (!response.ok) {
        json({ error: "QA webhook was rejected" }, 500);
        return;
      }
      res.writeHead(302, { Location: record.callback });
      res.end();
      return;
    }
    if (url.pathname === "/paystack/transaction/initialize") {
      counts.initializations++;
      const reference = String(body.reference);
      deposits.set(reference, {
        id: counts.initializations,
        reference,
        amount: Number(body.amount),
        currency: String(body.currency),
        customer: { email: String(body.email) },
        status: "abandoned",
        callback: String(body.callback_url),
      });
      json({
        status: true,
        data: {
          authorization_url: `https://checkout.paystack.com/qa-${reference}`,
          access_code: randomUUID(),
          reference,
        },
      });
      return;
    }
    if (url.pathname.startsWith("/paystack/transaction/verify/")) {
      counts.verifications++;
      const record = deposits.get(
        decodeURIComponent(url.pathname.split("/").at(-1)!),
      );
      json(
        record ? { status: true, data: record } : { status: false },
        record ? 200 : 404,
      );
      return;
    }
    if (url.pathname === "/paystack/bank") {
      json({
        status: true,
        data: [
          { name: "QA Test Bank", code: "999" },
          { name: "Another QA Bank", code: "888" },
        ],
      });
      return;
    }
    if (url.pathname === "/paystack/bank/resolve") {
      counts.bankResolves++;
      if (counts.bankResolves === 1) {
        json({ status: false }, 503);
        return;
      }
      json({
        status: true,
        data: {
          account_number: url.searchParams.get("account_number"),
          account_name: "QA BANK CUSTOMER",
        },
      });
      return;
    }
    if (url.pathname === "/paystack/transferrecipient") {
      json({ status: true, data: { recipient_code: "RCP_qa_recipient" } });
      return;
    }
    if (url.pathname === "/paystack/transfer") {
      counts.transfers++;
      const record = {
        reference: String(body.reference),
        amount: Number(body.amount),
        recipient: { recipient_code: String(body.recipient) },
        status: "success",
        currency: "NGN",
      };
      transfers.set(record.reference, record);
      json({
        status: true,
        data: { ...record, transfer_code: "TRF_qa_transfer" },
      });
      return;
    }
    if (url.pathname.startsWith("/paystack/transfer/verify/")) {
      json({
        status: true,
        data: transfers.get(
          decodeURIComponent(url.pathname.split("/").at(-1)!),
        ),
      });
      return;
    }
    if (url.pathname === "/vtpass/api/pay") {
      counts.bills++;
      const record = {
        request_id: String(body.request_id),
        amount: String(body.amount),
        unique_element: String(body.billersCode),
        status: "delivered",
      };
      bills.set(record.request_id, record);
      json({
        code: "000",
        requestId: record.request_id,
        content: { transactions: { ...record, phone: null } },
        amount: null,
        purchased_code: null,
      });
      return;
    }
    if (url.pathname === "/vtpass/api/requery") {
      const record = bills.get(String(body.request_id));
      json({
        code: record ? "000" : "099",
        requestId: body.request_id,
        content: record ? { ...record, phone: null } : {},
        amount: null,
        purchased_code: null,
      });
      return;
    }
    json({ error: "Unexpected QA provider request" }, 404);
  });
}
