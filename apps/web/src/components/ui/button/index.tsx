import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
export const buttonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-deep active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50";
export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${buttonClass} ${className}`} {...props} />;
}
export function ActionLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClass} ${className}`}>
      {children}
    </Link>
  );
}
