import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
