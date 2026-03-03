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
        hostname: "directustest.vtk.be", // your Directus domain
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // your Directus domain
      },
    ],
    // Enable image optimization caching
    minimumCacheTTL: 31536000, // 1 year
    formats: ['image/avif', 'image/webp'],
  },
  // Enable experimental features for better caching
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
    // Configure maximum body size for API routes (default is 10MB)
    // This allows file uploads up to 50MB
    middlewareClientMaxBodySize: '50mb' as any, // Using 'as any' to bypass TypeScript if property not in types yet
    // Increase server action body size limit (default is 1 MB)
    // This is needed for company information updates that might include large HTML descriptions
    // Note: File uploads are handled separately via Directus API, not through server actions
    // However, the payload can still be large due to HTML content from descriptions
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow dynamic imports for pdf-into-svg
      config.externals = config.externals || [];
      // Don't externalize pdf-into-svg - we want to bundle it
    }
    // Fix Windows standalone build: node:inspector produces invalid filenames (colons) on NTFS
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...config.resolve.alias, "node:inspector": "inspector" };
    return config;
  },
  turbopack: {
    resolveAlias: { "node:inspector": "inspector" },
  },
};

export default withSentryConfig(nextConfig, {
  org: "vtko-vzw",
  project: "career-frontend",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
