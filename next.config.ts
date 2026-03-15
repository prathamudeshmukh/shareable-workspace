import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["wrangler"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
