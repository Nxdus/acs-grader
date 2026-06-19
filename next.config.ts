import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  images: {
    remotePatterns: [new URL('https://lh3.googleusercontent.com/**')]
  }
};

export default nextConfig;
