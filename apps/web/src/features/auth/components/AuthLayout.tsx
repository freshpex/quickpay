import { Wordmark } from "../../../components/layout/wordmark";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="grid min-h-screen lg:grid-cols-[.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-deep p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Wordmark light />
        <div className="relative z-10">
          <span className="text-xs font-bold uppercase tracking-[.2em] text-lime">
            YOUR EVERYDAY, SIMPLIFIED
          </span>
          <h2 className="mt-6 text-6xl font-bold leading-[1.04] tracking-[-.05em]">
            Less paying.
            <br />
            More living.
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/60">
            A little airtime. A bill ticked off.
            <br />
            More room for the rest of your day.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <ShieldCheck size={18} /> Your account. Your payments. In your
          control.
        </div>
        <div
          aria-hidden
          className="absolute -bottom-32 -right-32 size-[430px] rounded-full border-[70px] border-lime/10"
        />
      </aside>
      <div className="px-5 py-7 md:px-12">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-ink/60"
          >
            <ArrowLeft size={16} /> Back home
          </Link>
          <span className="lg:hidden">
            <Wordmark placement="mobile" />
          </span>
        </div>
        <div className="mx-auto w-full max-w-md py-10 md:py-14">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="mb-8 mt-3 text-sm leading-relaxed text-ink/60">
            {description}
          </p>
          {children}
        </div>
      </div>
    </main>
  );
}
