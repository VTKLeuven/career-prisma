import type { NextConfig } from "next";

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
    // Increase server action body size limit (default is 1 MB)
    // This is needed for company information updates that might include large HTML descriptions
    // Note: File uploads are handled separately via Directus API, not through server actions
    // However, the payload can still be large due to HTML content from descriptions
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Note: proxyClientMaxBodySize is not yet available in Next.js 16.0.1 types
    // The middleware body size limit is handled by the server configuration
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow dynamic imports for pdf-into-svg
      config.externals = config.externals || [];
      // Don't externalize pdf-into-svg - we want to bundle it
    }
    return config;
  },
  // Add empty turbopack config to silence the warning
  // The webpack config is still needed for server-side bundling
  turbopack: {},
};

export default nextConfig;
