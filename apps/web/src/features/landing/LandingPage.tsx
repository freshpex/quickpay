import Link from "next/link";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { SceneMotion } from "./animations/MotionProvider";
import { Navigation } from "./components/navigation/Navigation";
import { Hero } from "./components/hero/Hero";
import { ServiceMarquee } from "./components/service-marquee/ServiceMarquee";
import { StackedCards } from "./components/stacked-cards/StackedCards";
import { ProductStory } from "./components/product-story/ProductStory";
import { WalkingStory } from "./components/walking-story/WalkingStory";
import { GiftShowcase } from "./components/gift-showcase/GiftShowcase";
import { ReferralStory } from "./components/referral-story/ReferralStory";
import { Wordmark } from "../../components/layout/wordmark";
export function LandingPage() {
  return (
    <SceneMotion>
      <Navigation />
      <main id="main" className="overflow-x-clip">
        <Hero />
        <ServiceMarquee />
        <StackedCards />
        <ProductStory />
        <WalkingStory />
        <GiftShowcase />
        <ReferralStory />
        <section className="mx-auto max-w-[1344px] px-5 py-24 md:py-32">
          <div className="flex flex-wrap items-end justify-between gap-10">
            <h2 className="text-5xl font-bold leading-[1.02] tracking-[-.055em] md:text-8xl">
              Big plans today?
              <br />
              <span className="text-brand">Pay. And go.</span>
            </h2>
            <Link
              href="/sign-up"
              className="group flex size-36 flex-col items-center justify-center gap-3 rounded-full bg-lime text-sm font-bold transition hover:rotate-6 hover:bg-brand hover:text-white"
            >
              Get started <ArrowUpRight size={35} />
            </Link>
          </div>
          <div className="mt-20 border-t border-ink/15 pt-10">
            <h3 className="mb-6 text-2xl font-bold">
              A few things you might ask.
            </h3>
            {[
              [
                "Can I start using every service today?",
                "Your account shows which services are available. Services stay unavailable until the necessary setup and access are confirmed.",
              ],
              [
                "How do I know my payment went through?",
                "Check the status in your transaction history. A receipt appears after your payment is confirmed. If it is still processing, check the payment before trying again.",
              ],
              [
                "When do referral rewards arrive?",
                "Rewards depend on an active campaign and a qualifying, verified payment. Check the rule summary in your account for eligibility and any holding period.",
              ],
            ].map(([q, a]) => (
              <details key={q} className="group border-b border-ink/10 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {q}
                  <ArrowDown
                    size={18}
                    className="shrink-0 transition group-open:rotate-180"
                  />
                </summary>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="bg-deep px-5 pb-8 pt-14 text-white">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-wrap justify-between gap-10">
            <div>
              <Wordmark light placement="footer" />
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/55">
                Everyday payments.
                <br />A little less effort. A little more life.
              </p>
            </div>
            <div className="flex flex-wrap gap-12 text-sm">
              <div className="grid gap-4">
                <a href="#everyday">Services</a>
                <Link href="/gift-cards">Gift cards</Link>
                <Link href="/referrals">Referrals</Link>
              </div>
              <div className="grid gap-4">
                <Link href="/support-info">Get support</Link>
                <Link href="/terms">Terms & conditions</Link>
                <Link href="/privacy">Privacy policy</Link>
              </div>
            </div>
          </div>
          <div className="mt-14 flex flex-wrap justify-between gap-4 border-t border-white/15 pt-7 text-[10px] text-white/45">
            <p>© {new Date().getFullYear()} Quick Pay. All rights reserved.</p>
            <p>Built for Nigeria. NGN. Africa/Lagos.</p>
          </div>
          <p className="mt-4 max-w-3xl text-[10px] leading-relaxed text-white/40">
            Third-party trademarks belong to their owners. People in stock media
            do not endorse Quick Pay.
          </p>
        </div>
      </footer>
    </SceneMotion>
  );
}
