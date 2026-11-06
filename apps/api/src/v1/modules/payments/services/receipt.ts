import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { formatMoney, type Transaction } from "@quickpay/contracts";
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
async function logo() {
  const name =
    "assets/brand/quick-pay-brand-pack-v1/website/header-light@2x.png";
  try {
    return await readFile(resolve(process.cwd(), name));
  } catch {
    return readFile(resolve(process.cwd(), "../..", name));
  }
}
export async function renderReceipt(t: Transaction, format: "pdf" | "png") {
  const brand = await logo();
  const status = t.status.replaceAll("_", " ");
  const color =
    t.status === "successful"
      ? "#166534"
      : ["processing", "created", "awaiting_authorization"].includes(t.status)
        ? "#92400e"
        : "#991b1b";
  const rows = [
    ["Transaction type", t.kind],
    ["Service", t.serviceId || "Wallet"],
    ["Reference", t.reference],
    [
      "Date · Africa/Lagos",
      new Date(t.createdAt).toLocaleString("en-GB", {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "short",
      }),
    ],
    ...(t.details.beneficiary
      ? [
          [
            "Recipient",
            String(t.details.beneficiaryName || t.details.beneficiary),
          ],
        ]
      : []),
    ...(t.details.accountName
      ? [
          [
            "Bank account",
            `${t.details.accountName} · •••• ${t.details.accountLast4 || ""}`,
          ],
        ]
      : []),
    ["Amount", formatMoney(t.amount)],
    ["Fee", formatMoney(t.fee)],
    ["Total", formatMoney(BigInt(t.amount) + BigInt(t.fee))],
  ];
  const lines = rows
    .map(([label, value], index) => {
      const y = 590 + index * 88;
      const text = String(value).slice(0, 160);
      const parts = text.match(/.{1,53}/g) || [""];
      return `<text x="112" y="${y}" font-size="23" fill="#71677e">${escape(label)}</text>${parts
        .slice(0, 2)
        .map(
          (part, i) =>
            `<text x="1128" y="${y + i * 25}" text-anchor="end" font-size="23" font-weight="600" fill="#191425">${escape(part)}</text>`,
        )
        .join(
          "",
        )}<line x1="112" x2="1128" y1="${y + 42}" y2="${y + 42}" stroke="#eeeaf4"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" viewBox="0 0 1240 1754">
  <rect width="1240" height="1754" fill="#faf9ff"/><rect x="48" y="48" width="1144" height="1658" rx="36" fill="white"/>
  <rect x="48" y="48" width="1144" height="12" rx="6" fill="#6d28d9"/>
  <image xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="data:image/png;base64,${brand.toString("base64")}" x="112" y="112" width="350" height="87"/>
  <g font-family="DejaVu Sans, Arial, sans-serif"><text x="112" y="268" font-size="23" fill="#71677e" letter-spacing="4">TRANSACTION RECEIPT</text>
  <text x="112" y="366" font-size="65" font-weight="700" fill="#2e1065">${escape(formatMoney(BigInt(t.amount) + BigInt(t.fee)))}</text>
  <rect x="112" y="408" width="1016" height="72" rx="16" fill="#faf9ff"/><text x="140" y="453" font-size="25" font-weight="700" fill="${color}">${escape(status.toUpperCase())}</text>
  ${lines}<line x1="112" x2="1128" y1="1500" y2="1500" stroke="#e9e2f3"/>
  <text x="112" y="1552" font-size="26" font-weight="700" fill="#6d28d9">Less paying. More living.</text>
  <text x="112" y="1594" font-size="20" fill="#71677e">${t.status === "successful" ? "Payment confirmed. Keep this receipt for your records." : "This receipt records the status shown above; it is not proof of a completed payment."}</text>
  <text x="112" y="1632" font-size="19" fill="#71677e">Quick Pay · NGN · Reference above identifies this transaction.</text></g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  if (format === "png") return png;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Quick Pay receipt · ${t.reference}`);
  pdf.setAuthor("Quick Pay");
  const page = pdf.addPage([595.28, 841.89]);
  page.drawImage(await pdf.embedPng(png), {
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
  });
  return Buffer.from(await pdf.save());
}
