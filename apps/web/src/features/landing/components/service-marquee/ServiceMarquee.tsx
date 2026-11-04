"use client";
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { useSceneMotion } from "../../animations/MotionProvider";
const brands = [
  ["MTN", "mtn.jpg"],
  ["Airtel", "airtel.svg"],
  ["Apple", "apple.svg"],
  ["Steam", "steam.svg"],
];
export function ServiceMarquee() {
  const { active: enabled } = useSceneMotion();
  const ref = useRef(null),
    visible = useInView(ref, { margin: "100px" });
  const active = enabled && visible;
  return (
    <section
      ref={ref}
      className="overflow-hidden border-y border-ink/10 bg-white py-8"
      aria-label="Service and gift-card brands"
    >
      <div className="mx-auto mb-6 max-w-[1344px] px-5 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-ink/50">
        An expanding everyday catalog · availability shown in your account
      </div>
      <motion.div
        className="flex w-max items-center gap-16 px-8 md:gap-28"
        animate={active ? { x: ["0%", "-50%"] } : { x: 0 }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {[0, 1, 2, 3].map((set) =>
          brands.map(([name, logo]) => (
            <div
              key={`${set}-${name}`}
              aria-hidden={set > 0}
              className="flex h-10 w-28 items-center justify-center gap-3"
            >
              <img
                src={`/media/${logo}`}
                alt={set === 0 ? name : ""}
                className="max-h-9 max-w-24 object-contain"
              />
              <span className="text-sm font-bold">{name}</span>
            </div>
          )),
        )}
      </motion.div>
      <p className="mt-5 text-center text-[10px] text-ink/45">
        Brand names identify catalog items. They do not imply a partnership.
      </p>
    </section>
  );
}
