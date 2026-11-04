"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import {
  ArrowUpRight,
  Phone,
  Wifi,
  Lightbulb,
  Wallet,
  ArrowDownLeft,
} from "lucide-react";
import Link from "next/link";
import { useSceneMotion } from "../../animations/MotionProvider";
const cards = [
  {
    n: "01",
    title: "Small taps.\nBig day energy.",
    copy: "Top up your airtime. Find your data plan. Keep the conversation going, wherever the day takes you.",
    color: "bg-brand text-white",
    tags: ["Airtime", "Data"],
    icons: [Phone, Wifi],
  },
  {
    n: "02",
    title: "Bills handled.\nLife continues.",
    copy: "Electricity, TV, internet and more. Check the details, see the total and keep your receipt.",
    color: "bg-lime text-ink",
    tags: ["Electricity", "Television", "Internet"],
    icons: [Lightbulb, Wifi],
  },
  {
    n: "03",
    title: "Your money.\nWithin reach.",
    copy: "Add money to your wallet. Pay from one place. Withdraw to a verified Nigerian bank account.",
    color: "bg-deep text-white",
    tags: ["Wallet", "Bank withdrawals"],
    icons: [Wallet, ArrowDownLeft],
  },
];
function Card({
  card,
  index,
}: {
  card: (typeof cards)[number];
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const { active: enabled } = useSceneMotion();
  const visible = useInView(ref);
  const active = enabled && visible;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 20%", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  return (
    <motion.article
      ref={ref}
      style={active ? { scale, top: 100 + index * 18 } : {}}
      className={`relative mb-7 grid min-h-[420px] gap-10 overflow-hidden rounded-[28px] p-7 md:sticky md:grid-cols-2 md:p-14 motion-reduce:static ${card.color}`}
    >
      <div>
        <span className="text-xs font-semibold opacity-60">
          {card.n} / YOUR EVERYDAY, SIMPLIFIED
        </span>
        <h3 className="mt-8 whitespace-pre-line text-4xl font-bold leading-[1.05] tracking-[-.05em] md:text-6xl">
          {card.title}
        </h3>
        <p className="mt-6 max-w-sm text-sm leading-relaxed opacity-75">
          {card.copy}
        </p>
        <Link
          href="/sign-up"
          className="mt-7 inline-flex items-center gap-7 border-b border-current/40 pb-2 text-sm font-bold"
        >
          Make it an everyday thing <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="relative flex min-h-48 items-center justify-center">
        <div className="absolute size-60 rounded-full border border-current/20 md:size-80" />
        <motion.div
          className="absolute size-44 rounded-full border border-dashed border-current/20 md:size-60"
          animate={active ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 45, ease: "linear", repeat: Infinity }}
        />
        <div className="relative grid gap-3">
          {card.tags.map((tag, i) => {
            const Icon = card.icons[i % 2];
            return (
              <motion.div
                key={tag}
                whileHover={active ? { x: 10, rotate: 2 } : undefined}
                className="flex w-56 items-center gap-4 rounded-2xl bg-white p-4 text-ink shadow-xl"
                style={{ marginLeft: i % 2 ? 30 : 0 }}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-paper text-brand">
                  <Icon size={23} />
                </span>
                <div>
                  <p className="text-sm font-bold">{tag}</p>
                  <p className="text-[10px] text-ink/50">
                    One less thing on your list.
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.article>
  );
}
export function StackedCards() {
  return (
    <section
      id="everyday"
      className="mx-auto max-w-[1344px] px-5 py-20 md:py-28"
    >
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <h2 className="max-w-2xl text-4xl font-bold leading-[1.05] tracking-[-.05em] md:text-6xl">
          For the things you pay.
          <br />
          <span className="text-ink/35">And the life you live.</span>
        </h2>
        <p className="max-w-[240px] text-sm leading-relaxed text-ink/60">
          One place for the little payments that keep your day moving.
        </p>
      </div>
      {cards.map((card, index) => (
        <Card key={card.n} card={card} index={index} />
      ))}
    </section>
  );
}
