import Link from "next/link";
import { Wordmark } from "../../components/layout/wordmark";
import { POLICY_VERSION } from "@quickpay/contracts";
const privacy = [
  [
    "Information we collect",
    "Account details include your name, email address, Nigerian phone number and verification status. We record payment details, support requests, policy acceptance and security activity. Gift-card sales may require private evidence.",
  ],
  [
    "Why we use it",
    "We use this information to manage your account, process supported payments, prevent misuse, answer support requests and keep reliable financial records.",
  ],
  [
    "Payments and service providers",
    "Hosted checkout is used for card collections. Quick Pay does not ask you to enter raw card details into its own forms. Relevant payment details are shared with the provider handling your selected service.",
  ],
  [
    "Private evidence",
    "Gift-card evidence is encrypted and restricted to your account and authorized reviewers. Uploaded evidence is held for a safety check before it can be downloaded.",
  ],
  [
    "Your choices",
    "You can update your display name in Settings. Contact support to request access, correction or account closure. Financial records may need to be retained; they are not erased from the ledger when an account is closed.",
  ],
];
const terms = [
  [
    "Your account",
    "Provide accurate account details and keep your password and verification codes private. You must verify your email before making payments. Never allow someone else to use your account to hide the source or destination of money.",
  ],
  [
    "Supported services",
    "Only services marked available can be used. Availability, amounts and plans may change. Check the recipient, amount, fees and total before authorizing a payment.",
  ],
  [
    "Payment status",
    "A payment is complete only after verification. A checkout redirect or an uploaded image is not proof of payment. If a payment is processing, check its status before trying again. Contact support if it remains unresolved.",
  ],
  [
    "Gift-card sales",
    "A quote has an expiry. Acceptance depends on checks of the supported brand, region, card type, ownership and usable value. An upload does not create wallet credit. A rejected sale includes a reason and can be raised with support.",
  ],
  [
    "Referral rewards",
    "Rewards require an active campaign and a verified qualifying payment. Eligibility, caps and holding periods follow the rule version attached to the reward. Reversed or refunded payments can reverse associated rewards.",
  ],
  [
    "Help and disputes",
    "Open a support request in your account and include the relevant payment reference. Never include your password, one-time code or raw payment-card information.",
  ],
];
export function PolicyPage({ kind }: { kind: "terms" | "privacy" }) {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-8 md:py-12">
      <Wordmark />
      <Link
        href="/sign-up"
        className="float-right inline-flex min-h-11 items-center text-xs font-bold text-brand"
      >
        Back to sign up
      </Link>
      <h1 className="mt-8 text-4xl font-bold tracking-tight">
        {kind === "terms" ? "Terms and Conditions" : "Privacy Policy"}
      </h1>
      <p className="mt-4 text-xs text-ink/45">
        Version {POLICY_VERSION.replace("-draft", "")} · 4 November 2026
      </p>
      <div className="mt-10 space-y-9">
        {(kind === "terms" ? terms : privacy).map(([heading, copy]) => (
          <section key={heading}>
            <h2 className="text-xl font-bold">{heading}</h2>
            <p className="mt-3 text-sm leading-loose text-ink/65">{copy}</p>
          </section>
        ))}
      </div>
      <div className="mt-12 border-t border-ink/10 pt-6 text-sm">
        <Link
          href={kind === "terms" ? "/privacy" : "/terms"}
          className="font-bold text-brand"
        >
          Read the{" "}
          {kind === "terms" ? "Privacy Policy" : "Terms and Conditions"}
        </Link>
      </div>
    </main>
  );
}
