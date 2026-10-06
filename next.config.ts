import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  // Note: outputFileTracingRoot removed - Next.js handles this automatically in standalone mode
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // Enable image optimization caching
    minimumCacheTTL: 31536000, // 1 year
    // WebP only. Images are resized on first request, and the optimiser cache
    // starts empty after every deploy: encoding AVIF took 4-10 s for the
    // homepage hero (a 12 MB photo) against 1-2 s for WebP, for files of the
    // same size. The first visitor after a deploy was the one who waited.
    formats: ['image/webp'],
  },
  // Enable experimental features for better caching
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
    // Configure maximum body size for API routes (default is 10MB)
    // This allows file uploads up to 50MB
    proxyClientMaxBodySize: '50mb',
    // Increase server action body size limit (default is 1 MB)
    // This is needed for company information updates that might include large HTML descriptions
    // File uploads use dedicated routes, not server actions.
    // However, the payload can still be large due to HTML content from descriptions
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    // Fix Windows standalone build: node:inspector produces invalid filenames (colons) on NTFS
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...config.resolve.alias, "node:inspector": "inspector" };
    return config;
  },
  turbopack: {
    root: process.cwd(),
    resolveAlias: { "node:inspector": "inspector" },
  },
  async headers() {
    // Pages where a hidden frame on another site could trick a signed-in user
    // into clicking (clickjacking): the back office and the account and login
    // pages. Public pages stay embeddable.
    const noFraming = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
    ];
    const protectedPaths = [
      "/admin",
      "/admin/:path*",
      "/dashboard",
      "/dashboard/:path*",
      "/student/:path*",
      "/login",
      "/student-login",
      "/register",
      "/accept-invite",
      "/reset-password",
      "/student-reset-password",
      "/verify-student",
    ];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      ...protectedPaths.map((source) => ({ source, headers: noFraming })),
    ];
  },
  // Reduce log spam: ignore polling endpoints (email-job-status, email-queue)
  logging: {
    incomingRequests: {
      ignore: [
        /\/api\/admin\/email-queue$/,
        /\/api\/admin\/forms\/[^/]+\/email-job-status/,
      ],
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: "vtko-vzw",
  project: "career-frontend",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
