import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["wrangler", "partykit"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
