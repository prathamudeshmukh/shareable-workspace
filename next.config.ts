import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["wrangler", "partykit"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/workspace/:path*",
        destination: "/:path*",
      },
    ];
  },
};

export default nextConfig;
