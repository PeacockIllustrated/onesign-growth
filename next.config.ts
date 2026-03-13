import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    turbo: {
      enabled: false,
    },
  },
};

export default nextConfig;
