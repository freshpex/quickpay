import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
const config = (phase: string): NextConfig => ({
  output: phase === PHASE_DEVELOPMENT_SERVER ? undefined : "export",
  trailingSlash: true,
  images: { unoptimized: true },
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  transpilePackages: ["@quickpay/contracts", "@quickpay/api-client"],
  // Local development proxies API requests; production uses Render static routes.
  ...(phase === PHASE_DEVELOPMENT_SERVER
    ? {
        async rewrites() {
          return [
            {
              source: "/api/v1/:path*",
              destination: `${process.env.API_ORIGIN || (process.env.API_HOSTPORT ? `http://${process.env.API_HOSTPORT}` : "http://localhost:3001")}/api/v1/:path*`,
            },
          ];
        },
      }
    : {}),
});
export default config;
