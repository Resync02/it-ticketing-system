
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
      },
    },
  },

  // URL publik untuk halaman pengajuan tiket client
  async rewrites() {
    return [
      {
        source: "/ticketingsystem",
        destination: "/client/ticket",
      },
    ];
  },
};

export default nextConfig;
