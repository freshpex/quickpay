"use client";
import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Wordmark } from "../../../../components/layout/wordmark";
export function Navigation() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-ink/5 bg-paper">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 md:px-12">
        <Wordmark />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-9 text-sm font-semibold lg:flex"
        >
          <a href="#everyday">Your everyday</a>
          <a href="#how-it-works">How it works</a>
          <a href="#rewards">Refer & earn</a>
          <Link href="/support-info">Need a hand?</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden px-3 text-sm font-bold sm:block"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="hidden items-center gap-3 rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition hover:bg-deep sm:flex"
          >
            Get started <ArrowUpRight size={17} />
          </Link>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
            className="flex size-11 items-center justify-center lg:hidden"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <motion.nav
          initial={{ y: -10, opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
          id="mobile-menu"
          className="absolute inset-x-0 top-full grid gap-1 border-b bg-paper p-5 shadow-xl lg:hidden"
          aria-label="Mobile navigation"
        >
          {[
            ["Your everyday", "#everyday"],
            ["How it works", "#how-it-works"],
            ["Refer & earn", "#rewards"],
            ["Log in", "/sign-in"],
            ["Create an account", "/sign-up"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-lg p-3 font-semibold hover:bg-brand/5"
            >
              {label}
            </Link>
          ))}
        </motion.nav>
      )}
    </header>
  );
}
