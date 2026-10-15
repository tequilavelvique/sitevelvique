import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(process.cwd(), "../..");

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@velvique/content", "@velvique/contracts", "@velvique/vault", "@velvique/pay"],
  // Node SDK, loaded from node_modules at runtime instead of bundled. It reaches SSR through @base-org/account's
  // node entry and lazily imports optional @x402/* peers we don't install, which the bundler can't resolve.
  serverExternalPackages: ["@coinbase/cdp-sdk"],
  turbopack: { root: monorepoRoot },
  // drei and postprocessing are barrel files: importing six helpers otherwise makes dev compile every module they
  // re-export. This rewrites the imports to the files actually used.
  experimental: {
    optimizePackageImports: ["@react-three/drei", "@react-three/postprocessing"],
    // Turbopack's persistent dev cache (on by default in Next 16) was the multi-minute stall: on this drive its
    // snapshots took 200-390 s and a compaction rewrote 456 MB, blocking route compiles behind it until they
    // failed. In-memory caching only; a cold start compiles once and every later route/HMR is fast.
    turbopackFileSystemCacheForDev: false,
  },
  outputFileTracingRoot: monorepoRoot,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "api.grove.storage" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // camera for the invitation QR scanner, xr-spatial-tracking for AR
          { key: "Permissions-Policy", value: "camera=(self), xr-spatial-tracking=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
