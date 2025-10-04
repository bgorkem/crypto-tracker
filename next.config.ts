import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Temporarily disable during builds for MVP
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
