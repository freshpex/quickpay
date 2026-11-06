import type { NextConfig } from "next";
export default {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  transpilePackages: ["@quickpay/contracts", "@quickpay/database"],
  serverExternalPackages: ["pg", "sharp"],
  outputFileTracingIncludes: {
    "/api/v1/payments/*/receipt": [
      "../../assets/brand/quick-pay-brand-pack-v1/website/header-light@2x.png",
    ],
  },
} satisfies NextConfig;
