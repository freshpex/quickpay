import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ConnectionStatus } from "../components/feedback/connection-status/ConnectionStatus";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.WEB_ORIGIN ||
      "http://localhost:3000",
  ),
  applicationName: "Quick Pay",
  title: {
    default: "Quick Pay | Less paying. More living.",
    template: "%s | Quick Pay",
  },
  description:
    "Your everyday payments, together. Wallet, airtime, data, bills and gift cards for life in Nigeria.",
  manifest: "/brand/site.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/brand/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [
      {
        url: "/brand/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "Quick Pay",
    locale: "en_NG",
    title: "Quick Pay | Less paying. More living.",
    description:
      "Your everyday payments, together. Wallet, airtime, data, bills and gift cards for life in Nigeria.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quick Pay | Less paying. More living.",
    description: "Your everyday payments, together.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Quick Pay. Less paying. More living.",
      },
    ],
  },
};
export const viewport: Viewport = { themeColor: "#6D28D9" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NG">
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-lime px-5 py-3 text-ink focus:not-sr-only"
        >
          Skip to content
        </a>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <ConnectionStatus />
      </body>
    </html>
  );
}
