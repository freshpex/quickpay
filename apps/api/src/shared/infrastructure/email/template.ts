const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function emailTemplate(input: {
  subject: string;
  text: string;
  siteUrl: string;
  otp?: string;
}) {
  let action: URL | undefined;
  let actionSource = "";
  try {
    const origin = new URL(input.siteUrl);
    for (const value of input.text.match(/https?:\/\/[^\s<>]+/g) || []) {
      const url = new URL(value);
      if (url.origin === origin.origin && !url.username && !url.password) {
        action = url;
        actionSource = value;
        break;
      }
    }
  } catch {
    /* A message remains readable without an action link. */
  }
  const paragraphs = input.text
    .split(/\n+/)
    .map((line) =>
      actionSource ? line.replace(actionSource, "").trim() : line,
    )
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:0 0 18px;color:#51465f;font-size:16px;line-height:1.7;word-break:break-word;overflow-wrap:anywhere">${escape(line)}</p>`,
    )
    .join("");
  const actionLabel = /verify.*email/i.test(input.subject)
    ? "Verify email address"
    : /reset.*password/i.test(input.subject)
      ? "Reset password"
      : /transaction/i.test(input.subject)
        ? "View transaction"
        : "Open Quick Pay";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#faf9ff;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escape(input.subject)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-collapse:separate;background:#fff;border:1px solid #e9e2f3;border-top:6px solid #6d28d9;border-radius:24px"><tr><td style="padding:36px 32px"><img src="cid:quickpay-logo" width="210" alt="Quick Pay" style="display:block;width:210px;max-width:100%;height:auto"><p style="color:#6d28d9;font-size:11px;letter-spacing:2px;font-weight:bold;margin:32px 0 12px">YOUR QUICK PAY ACCOUNT</p><h1 style="color:#2e1065;font-size:28px;line-height:1.3;margin:0 0 24px">${escape(input.subject)}</h1>${input.otp ? `<div style="background:#faf9ff;border:1px solid #e9e2f3;border-radius:16px;padding:22px;text-align:center;font-size:34px;font-weight:bold;letter-spacing:8px;color:#6d28d9;margin-bottom:24px">${escape(input.otp)}</div>` : ""}${paragraphs}${action ? `<p style="margin:28px 0"><a href="${escape(action.href)}" style="display:inline-block;background:#6d28d9;color:white;border-radius:12px;padding:15px 24px;font-weight:bold;text-decoration:none">${actionLabel}</a></p>` : ""}<hr style="border:0;border-top:1px solid #eeeaf4;margin:30px 0"><p style="font-weight:bold;color:#6d28d9;font-size:17px">Less paying. More living.</p><p style="font-size:12px;line-height:1.7;color:#71677e;margin-bottom:0">Quick Pay will never ask you to reply with your password, transaction PIN, authenticator code or card details. If you did not request this activity, secure your account and contact support through the app.</p></td></tr></table><p style="color:#8d819a;font-size:11px">Quick Pay · Account and transaction notifications</p></td></tr></table></body></html>`;
}
