"use client";
import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence,
  useInView,
} from "motion/react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { ProductPreview } from "../product-preview/ProductPreview";
import { useSceneMotion } from "../../animations/MotionProvider";
const steps = [
  {
    title: "Start with your wallet.",
    copy: "Create your account, verify your contact details and add money through secure hosted checkout.",
    cta: "Your everyday starts here.",
  },
  {
    title: "Check it. Then pay it.",
    copy: "Choose a service. Check who you are paying, the amount and any fees. You stay in control.",
    cta: "One less thing to think about.",
  },
  {
    title: "Keep the receipt.",
    copy: "Know when your payment is processing and when it is confirmed. Your history stays with you.",
    cta: "A little more peace of mind.",
  },
];
export function ProductStory() {
  const ref = useRef<HTMLElement>(null);
  const { active } = useSceneMotion();
  const visible = useInView(ref);
  const [step, setStep] = useState(0);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (active && wide) setStep(Math.min(2, Math.floor(v * 3)));
  });
  const pinned = active && wide;
  return (
    <section
      id="how-it-works"
      ref={ref}
      className={`relative bg-deep text-white ${pinned ? "md:h-[250vh]" : ""}`}
    >
      <div
        className={
          pinned
            ? "md:sticky md:top-0 md:flex md:min-h-screen md:items-center"
            : ""
        }
      >
        <div className="mx-auto grid w-full max-w-[1344px] gap-14 px-5 py-20 md:grid-cols-2 md:items-center md:px-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-[.18em] text-lime">
              A FEW TAPS. BACK TO LIFE.
            </span>
            <h2 className="mb-10 mt-5 text-5xl font-bold leading-[1.05] tracking-[-.05em] md:text-7xl">
              Simple feels
              <br />
              really good.
            </h2>
            <div className="space-y-7">
              {steps.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => setStep(i)}
                  aria-pressed={i === step}
                  className={`flex w-full items-start gap-4 text-left transition-opacity ${i === step || !pinned ? "opacity-100" : "opacity-40"}`}
                >
                  <span
                    className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs ${i === step ? "border-lime bg-lime text-deep" : "border-white/40"}`}
                  >
                    {i < step ? <Check size={15} /> : i + 1}
                  </span>
                  <span>
                    <span className="block text-xl font-bold">{s.title}</span>
                    <span className="mt-2 block max-w-sm text-sm leading-relaxed text-white/65">
                      {s.copy}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <Link
              href="/sign-up"
              aria-label="Create your Quick Pay account"
              className="mt-9 inline-flex min-h-14 items-center gap-8 rounded-full bg-lime px-6 text-sm font-bold text-deep"
            >
              Create your account <ArrowUpRight size={20} />
            </Link>
            <p className="mt-3 text-xs text-lime" aria-live="polite">
              {steps[step].cta}
            </p>
          </div>
          <div className="relative flex min-h-[430px] items-center justify-center">
            <motion.div
              aria-hidden
              className="absolute size-72 rounded-full border border-white/10 md:size-[440px]"
              animate={
                active && visible ? { scale: [1, 1.07, 1] } : { scale: 1 }
              }
              transition={{ duration: 5, repeat: Infinity }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={active ? { rotateY: 15, opacity: 0.5, x: 20 } : false}
                animate={{ rotateY: 0, opacity: 1, x: 0 }}
                exit={active ? { rotateY: -15, opacity: 0, x: -20 } : undefined}
                transition={{ duration: 0.35 }}
                className="z-10 w-full max-w-[330px]"
              >
                <ProductPreview step={step} />
              </motion.div>
            </AnimatePresence>
            <span className="absolute -bottom-3 rounded-full border border-white/20 px-4 py-2 text-[10px] text-white/50">
              One wallet. Your everyday.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
