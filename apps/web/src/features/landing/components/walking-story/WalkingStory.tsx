"use client";
import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useSceneMotion } from "../../animations/MotionProvider";
export function WalkingStory() {
  const ref = useRef<HTMLElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const { active } = useSceneMotion();
  const visible = useInView(ref, { margin: "100px" });
  const [failed, setFailed] = useState(false);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-5, 5]);
  useEffect(() => {
    if (active && visible && desktop)
      video.current?.play().catch(() => setFailed(true));
    else video.current?.pause();
  }, [active, visible, desktop]);
  return (
    <section ref={ref} className="overflow-hidden bg-lime px-5 py-20 md:py-28">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h2 className="text-5xl font-bold leading-[1.02] tracking-[-.055em] md:text-8xl">
            Your day has
            <br />
            places to be.
          </h2>
          <p className="max-w-xs text-base leading-relaxed text-ink/70">
            On your way to work. Catching up with friends. Paying a bill
            shouldn’t slow the good parts down.
          </p>
        </div>
        <div className="relative mt-14 flex min-h-[400px] items-center justify-center md:min-h-[550px]">
          <span
            aria-hidden
            className="absolute left-0 top-1/3 text-[clamp(4rem,14vw,13rem)] font-black tracking-[-.08em] text-deep/10"
          >
            KEEP MOVING
          </span>
          <motion.div
            style={active && desktop ? { x, rotate } : {}}
            className="relative z-10 w-full max-w-[650px] overflow-hidden rounded-[30px] border-[7px] border-white bg-deep shadow-2xl"
          >
            <img
              src="/media/person-poster.jpg"
              alt="A woman walking through the city while using her phone"
              className="aspect-4/3 w-full object-cover"
              loading="lazy"
            />
            {active && desktop && visible && !failed && (
              <video
                ref={video}
                aria-label="Woman walking through the city"
                muted
                loop
                playsInline
                preload="none"
                poster="/media/person-poster.jpg"
                onError={() => setFailed(true)}
                className="absolute inset-0 size-full object-cover"
              >
                <source src="/media/walking.mp4" type="video/mp4" />
              </video>
            )}
            <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-ink">
              A little more time for you.
            </span>
          </motion.div>
          <motion.div
            className="absolute -right-2 top-6 z-20 flex size-20 items-center justify-center rounded-full bg-deep text-lime md:right-12 md:size-32"
            animate={active ? { rotate: [0, 20, 0] } : {}}
            transition={{ duration: 6, repeat: Infinity }}
          >
            <ArrowUpRight size={50} />
          </motion.div>
        </div>
        <p className="mt-8 text-right text-[10px] text-ink/55">
          Footage: Darlene Alderson / Pexels. People shown are models, not
          endorsements.
        </p>
      </div>
    </section>
  );
}
