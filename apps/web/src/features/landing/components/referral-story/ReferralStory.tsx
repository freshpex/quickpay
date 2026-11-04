"use client";
import { motion, useInView } from "motion/react";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, Receipt, Wallet, ArrowUpRight } from "lucide-react";
import { useSceneMotion } from "../../animations/MotionProvider";
import { api } from "@quickpay/api-client";
export function ReferralStory() {
  const ref = useRef(null),
    visible = useInView(ref);
  const { active } = useSceneMotion();
  const [summary, setSummary] = useState(
    "Rewards are available only when a qualifying campaign is active.",
  );
  useEffect(() => {
    api<{ summary: string }>("/rewards/active-rule")
      .then((r) => setSummary(r.summary))
      .catch(() => {});
  }, []);
  return (
    <section
      id="rewards"
      ref={ref}
      className="bg-brand px-5 py-20 text-white md:py-28"
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[.18em] text-lime">
              GOOD THINGS ARE BETTER SHARED
            </span>
            <h2 className="mt-5 text-5xl font-bold leading-[1.04] tracking-[-.05em] md:text-7xl">
              Invite friends.
              <br />
              Earn rewards.
            </h2>
          </div>
          <Link
            href="/referrals"
            className="inline-flex min-h-14 items-center gap-8 rounded-full bg-lime px-7 text-sm font-bold text-deep"
          >
            See referral details <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div
            aria-hidden
            className="absolute inset-x-20 top-12 hidden h-px overflow-hidden bg-white/30 md:block"
          >
            <motion.div
              className="h-full w-1/4 bg-lime"
              animate={active && visible ? { x: ["-100%", "500%"] } : { x: 0 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </div>
          {[
            {
              Icon: UserPlus,
              title: "Send your invitation.",
              copy: "Share your personal referral code with a friend.",
            },
            {
              Icon: Receipt,
              title: "They pay a qualifying bill.",
              copy: "A verified payment must meet the active reward rules.",
            },
            {
              Icon: Wallet,
              title: "Your reward arrives.",
              copy: "After any holding period, eligible rewards can be claimed.",
            },
          ].map(({ Icon, title, copy }, i) => (
            <motion.div
              key={title}
              animate={active && visible ? { y: [0, -5, 0] } : { y: 0 }}
              transition={{ duration: 4, delay: i * 0.5, repeat: Infinity }}
              className="relative"
            >
              <span className="relative flex size-24 items-center justify-center rounded-full border border-white/25 bg-brand">
                <Icon size={32} />
                <span className="absolute right-0 top-0 flex size-6 items-center justify-center rounded-full bg-lime text-xs font-bold text-deep">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-7 text-xl font-bold">{title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/65">
                {copy}
              </p>
            </motion.div>
          ))}
        </div>
        <p className="mt-12 rounded-xl border border-white/20 p-4 text-xs leading-relaxed text-white/75">
          {summary}
        </p>
      </div>
    </section>
  );
}
