"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Gift } from "lucide-react";
import { useSceneMotion } from "../../animations/MotionProvider";
export function GiftShowcase() {
  const { active } = useSceneMotion();
  const ref = useRef(null),
    visible = useInView(ref);
  return (
    <section
      ref={ref}
      id="gift-cards"
      className="mx-auto grid max-w-[1344px] gap-12 px-5 py-24 md:grid-cols-2 md:items-center md:py-32"
    >
      <div className="relative flex h-[340px] items-center justify-center md:h-[420px]">
        {[
          {
            name: "Steam",
            logo: "steam.svg",
            bg: "bg-[#17283e] text-white",
            r: -18,
            x: -65,
          },
          {
            name: "Apple",
            logo: "apple.svg",
            bg: "bg-white text-ink",
            r: 0,
            x: 0,
          },
          {
            name: "Amazon",
            logo: "amazon.svg",
            bg: "bg-[#ffbf52] text-ink",
            r: 18,
            x: 65,
          },
        ].map((c, i) => (
          <motion.div
            key={c.name}
            className={`absolute flex h-60 w-44 flex-col justify-between rounded-2xl border border-ink/10 p-5 shadow-xl md:h-72 md:w-52 ${c.bg}`}
            initial={false}
            animate={{
              rotate: c.r + (active && visible ? Math.sin(i) * 3 : 0),
              x: c.x,
              y: active && visible ? [0, -10, 0] : 0,
            }}
            transition={{
              y: { duration: 4 + i, repeat: Infinity },
              rotate: { duration: 1 },
            }}
            whileHover={active ? { y: -35, rotate: 0, zIndex: 10 } : undefined}
          >
            <img
              src={`/media/${c.logo}`}
              alt={`${c.name} logo`}
              className={`h-12 w-20 object-contain object-left ${i === 0 ? "invert" : ""}`}
            />
            <div>
              <p className="text-2xl font-bold">{c.name}</p>
              <p className="mt-1 text-[10px] opacity-60">GIFT CARD</p>
            </div>
            <Gift size={23} />
          </motion.div>
        ))}
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-[.15em] text-brand">
          GOOD GIFTS. CLEAR VALUE.
        </span>
        <h2 className="mt-5 text-5xl font-bold leading-[1.04] tracking-[-.05em] md:text-6xl">
          More to give.
          <br />
          More from your cards.
        </h2>
        <p className="mt-6 max-w-md text-base leading-relaxed text-ink/60">
          Explore buying and selling gift cards. Supported brands, regions and
          rates appear when available. Every sale gets a clear quote and a
          careful review before settlement.
        </p>
        <Link
          href="/gift-cards"
          className="mt-7 inline-flex min-h-12 items-center gap-8 border-b border-ink/30 font-bold"
        >
          Explore gift cards <ArrowUpRight size={20} />
        </Link>
        <p className="mt-4 text-xs text-ink/45">
          Track your sale and settlement from your account.
        </p>
      </div>
    </section>
  );
}
