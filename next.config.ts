import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/workspace",
  serverExternalPackages: ["wrangler", "partykit"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
