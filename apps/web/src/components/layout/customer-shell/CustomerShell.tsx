"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Wallet,
  Phone,
  Gift,
  Users,
  Receipt,
  Bell,
  Settings,
  Headphones,
  Bookmark,
  LogOut,
  Menu,
  X,
  ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";
import { api, mutation } from "@quickpay/api-client";
import { Wordmark } from "../wordmark";
import { LoadingState, ErrorState } from "../../feedback";
const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/wallet", "Wallet", Wallet],
  ["/bills", "Pay a bill", Phone],
  ["/gift-cards", "Gift cards", Gift],
  ["/exchanges", "Exchanges", ArrowLeftRight],
  ["/referrals", "Refer & earn", Users],
  ["/transactions", "Transactions", Receipt],
  ["/beneficiaries", "Beneficiaries", Bookmark],
  ["/notifications", "Notifications", Bell],
  ["/settings", "Settings", Settings],
  ["/support", "Support", Headphones],
] as const;
export function CustomerShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{
      name: string;
      email: string;
      role?: string;
    }>(),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [desktop, setDesktop] = useState(false);
  const path = usePathname(),
    router = useRouter();
  useEffect(() => {
    const mq = window.matchMedia("(min-width:1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    api<{ user: { name: string; email: string; role?: string } } | null>(
      "/auth/get-session",
    )
      .then((s) => {
        if (!s?.user) router.replace("/sign-in");
        else setUser(s.user);
      })
      .catch(() =>
        setError("We could not load your account. Please refresh the page."),
      );
  }, [router]);
  async function logout() {
    try {
      await api("/auth/sign-out", mutation({}));
      router.replace("/sign-in");
    } catch {
      setError("We could not sign you out. Please try again.");
    }
  }
  if (!user)
    return (
      <main id="main" className="mx-auto max-w-xl py-20">
        {error ? <ErrorState message={error} /> : <LoadingState />}
      </main>
    );
  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-ink/10 bg-white px-5 py-3 lg:hidden">
        <Wordmark placement="mobile" />
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close account menu" : "Open account menu"}
          aria-expanded={open}
          className="flex size-11 items-center justify-center"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <button
          aria-label="Close account menu overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-deep/50 lg:hidden"
        />
      )}
      <aside
        inert={!open && !desktop}
        className={`fixed bottom-0 left-0 top-[69px] z-50 flex w-64 flex-col border-r border-ink/10 bg-white px-5 py-6 transition-transform lg:top-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-9 hidden px-2 lg:block">
          <Wordmark placement="sidebar" />
        </div>
        <nav
          aria-label="Account navigation"
          className="flex-1 space-y-1 overflow-y-auto"
        >
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={path.startsWith(href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${path.startsWith(href) ? "bg-brand text-white" : "text-ink/60 hover:bg-brand/5 hover:text-brand"}`}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="flex min-h-11 items-center gap-3 px-3 text-sm font-bold text-brand"
            >
              <ShieldCheck size={19} />
              Admin
            </Link>
          )}
        </nav>
        <button
          onClick={logout}
          className="mt-4 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink/50 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </aside>
      <div className="lg:ml-64">
        <header className="hidden items-center justify-between border-b border-ink/10 bg-white px-10 py-5 lg:flex">
          <p className="text-xs text-ink/45">Your everyday, together.</p>
          <div className="flex items-center gap-5">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="flex size-10 items-center justify-center rounded-full bg-paper"
            >
              <Bell size={20} />
            </Link>
            <span className="flex size-10 items-center justify-center rounded-full bg-lime text-sm font-bold">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <main
          id="main"
          className="mx-auto max-w-[1300px] px-5 py-8 pb-24 md:px-10 md:py-10"
        >
          {error && <ErrorState message={error} />} {children}
        </main>
      </div>
      <nav
        aria-label="Quick account navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-ink/10 bg-white px-2 py-2 lg:hidden"
      >
        {links
          .slice(0, 3)
          .concat([links[5]])
          .map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 text-[10px] ${path === href ? "font-bold text-brand" : "text-ink/50"}`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
      </nav>
    </div>
  );
}
