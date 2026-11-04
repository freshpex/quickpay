import Image from "next/image";
import Link from "next/link";

type Placement = "header" | "footer" | "sidebar" | "mobile" | "preview";
type BrandProps = { light?: boolean; placement?: Placement };

// The supplied lockups already contain the name. Never add live lettering.
export function BrandLogo({ light = false, placement = "header" }: BrandProps) {
  const tone = light ? "dark" : "light";
  const compact = placement === "preview";
  const src = compact
    ? `/brand/mobile-headers/compact-${tone}.svg`
    : placement === "mobile"
      ? `/brand/mobile-headers/header-${tone}.svg`
      : `/brand/${placement === "footer" ? "footer" : "header"}-${tone}.svg`;
  return (
    <Image
      src={src}
      alt="Quick Pay"
      width={compact ? 512 : 2180}
      height={compact ? 512 : 540}
      className={
        compact
          ? "block size-9 shrink-0"
          : placement === "footer"
            ? "block h-auto w-[200px] max-w-full"
            : placement === "sidebar"
              ? "block h-auto w-[180px] max-w-full"
              : "block h-auto w-[160px] max-w-full md:w-[180px]"
      }
      unoptimized
    />
  );
}

export function Wordmark(props: BrandProps) {
  return (
    <Link
      href="/"
      aria-label="Quick Pay home"
      className="inline-flex min-h-11 max-w-full shrink-0 items-center"
    >
      <BrandLogo {...props} />
    </Link>
  );
}
