"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  ArrowUpRight,
  ArrowDown,
  Check,
  ShieldCheck,
  Phone,
} from "lucide-react";
import { useSceneMotion } from "../../animations/MotionProvider";
import { ProductPreview } from "../product-preview/ProductPreview";
export function Hero() {
  const { active: enabled } = useSceneMotion();
  const ref = useRef(null),
    visible = useInView(ref);
  const active = enabled && visible;
  return (
    <section
      ref={ref}
      className="relative mx-auto max-w-[1440px] px-5 pb-16 pt-12 md:px-12 md:pb-24 md:pt-16"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
        <div className="relative z-10">
          <motion.div
            initial={false}
            animate={{ y: 0 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand/15 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.12em]"
          >
            <span className="size-2 rounded-full bg-brand" />
            Made for your everyday in Nigeria
          </motion.div>
          <motion.h1
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[650px] text-[clamp(3.5rem,6.8vw,6.6rem)] font-bold leading-[.98] tracking-[-.065em]"
          >
            Less paying.
            <br />
            <span className="relative inline-block text-brand">
              More living.
              <motion.svg
                aria-hidden
                viewBox="0 0 500 20"
                className="absolute -bottom-4 left-0 w-full"
                animate={active ? { scaleX: [0.9, 1, 0.9] } : { scaleX: 1 }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                <path
                  d="M3 13 Q230 -3 495 12"
                  fill="none"
                  stroke="#D9F86C"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              </motion.svg>
            </span>
          </motion.h1>
          <motion.p
            initial={{ y: 25 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-10 max-w-[405px] text-lg leading-relaxed text-ink/65"
          >
            Airtime, data, bills and gift cards.
            <br className="hidden md:block" /> Your everyday payments, in one
            happy place.
          </motion.p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/sign-up"
              className="group inline-flex min-h-14 items-center gap-8 rounded-full bg-brand px-7 font-bold text-white transition hover:bg-deep active:scale-95"
            >
              Get started{" "}
              <ArrowUpRight
                className="transition group-hover:-translate-y-1 group-hover:translate-x-1"
                size={22}
              />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center gap-2 border-b border-ink/30 text-sm font-semibold"
            >
              See how it works <ArrowDown size={17} />
            </a>
          </div>
          <p className="mt-7 flex items-center gap-2 text-xs text-ink/60">
            <ShieldCheck size={16} className="text-brand" />
            Clear fees. Confirm before you pay.
          </p>
        </div>
        <div className="relative isolate mx-auto h-[470px] w-full max-w-[620px] sm:h-[570px]">
          <motion.div
            aria-hidden
            className="absolute inset-x-2 bottom-5 top-0 rounded-t-[45%] rounded-b-[30px] bg-brand"
            animate={active ? { rotate: [-3, 1, -3] } : { rotate: 0 }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <div className="absolute inset-x-6 bottom-10 top-5 overflow-hidden rounded-t-[45%] rounded-b-[25px] bg-deep">
            <img
              src="/media/lagos-woman.jpg"
              alt="A woman enjoying her day while using her phone"
              className="h-full w-full object-cover object-[60%_center]"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-linear-to-t from-deep/70 via-transparent to-transparent" />
            <p className="absolute right-5 top-12 -rotate-6 text-sm font-bold text-white">
              Life is happening.
              <br />
              Keep up.
            </p>
          </div>
          <motion.div
            className="absolute -left-1 bottom-1 z-10 w-[215px] origin-bottom-left sm:-left-4 sm:bottom-3 sm:w-[275px]"
            animate={
              active
                ? { y: [0, -12, 0], rotate: [-7, -4, -7] }
                : { y: 0, rotate: -4 }
            }
            transition={{ duration: 6, repeat: Infinity }}
          >
            <div className="origin-bottom-left scale-[.73] sm:scale-[.86]">
              <ProductPreview />
            </div>
          </motion.div>
          <motion.div
            className="absolute -right-1 top-[42%] z-20 flex items-center gap-3 rounded-2xl bg-lime p-3 shadow-xl sm:-right-4 sm:p-4"
            animate={
              active ? { x: [0, 8, 0], rotate: [4, 0, 4] } : { rotate: 0 }
            }
            transition={{ duration: 5, repeat: Infinity }}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-deep text-lime">
              <Phone size={20} />
            </span>
            <div>
              <p className="text-xs font-bold">Airtime? Sorted.</p>
              <p className="mt-1 text-[10px]">Back to the good stuff.</p>
            </div>
            <Check size={17} />
          </motion.div>
          <div className="absolute right-0 bottom-7 rounded-full bg-white px-4 py-2 text-[10px] font-semibold shadow-lg">
            Your everyday, together.
          </div>
          <motion.div
            aria-hidden
            className="absolute right-5 top-0 flex size-16 items-center justify-center rounded-full border-[1px] border-deep bg-lime text-deep sm:size-20"
            animate={active ? { rotate: [-15, 15, -15] } : { rotate: 0 }}
            transition={{ duration: 8, repeat: Infinity }}
          >
            <ArrowUpRight size={40} />
          </motion.div>
        </div>
      </div>
      <div className="mt-12 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[.16em] text-ink/45">
        <span className="h-px w-12 bg-ink/20" /> Scroll for the everyday upgrade{" "}
        <ArrowDown size={14} />
      </div>
    </section>
  );
}
