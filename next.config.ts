import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Next.js treats this project directory as the root for output file tracing
  outputFileTracingRoot: __dirname,
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
  },
};

export default nextConfig;
