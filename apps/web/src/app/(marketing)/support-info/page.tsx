import Link from "next/link";
import { Wordmark } from "../../../components/layout/wordmark";
import { ActionLink } from "../../../components/ui/button";
export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 py-10">
      <Wordmark />
      <h1 className="mt-16 text-5xl font-bold tracking-tight">Need a hand?</h1>
      <p className="mt-6 text-lg leading-relaxed text-ink/60">
        Sign in to open a support request. You can follow replies in your
        account and link the payment you need help with.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <ActionLink href="/support">Open support</ActionLink>
        <Link
          href="/forgot-password"
          className="inline-flex min-h-12 items-center px-4 text-sm font-bold text-brand"
        >
          Trouble signing in?
        </Link>
      </div>
      <p className="mt-10 rounded-xl border border-ink/10 p-5 text-sm leading-relaxed text-ink/55">
        Never share your password or verification codes. If a payment is still
        processing, check its status before starting another one.
      </p>
    </main>
  );
}
