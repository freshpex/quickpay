import type { NextConfig } from "next";
export default {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  transpilePackages: ["@quickpay/contracts", "@quickpay/database"],
  serverExternalPackages: ["pg"],
} satisfies NextConfig;
