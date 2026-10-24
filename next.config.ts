import type { NextConfig } from "next";

// Optional x402 payment modules lazily imported by @coinbase/cdp-sdk (via
// RainbowKit -> wagmi Base Account connector). Unused here, so stub them.
const UNUSED_OPTIONAL_MODULES = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
];
const EMPTY_MODULE = "./src/lib/stubs/empty-module.js";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Polymarket serves images from S3; skip the optimizer so images load
    // straight from the CDN even when the server cannot reach it.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "polymarket-upload.s3.us-east-2.amazonaws.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.polymarket.com" },
    ],
  },
  turbopack: {
    resolveAlias: Object.fromEntries(UNUSED_OPTIONAL_MODULES.map((m) => [m, EMPTY_MODULE])),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
