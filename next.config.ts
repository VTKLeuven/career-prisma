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
  },
};

export default nextConfig;
