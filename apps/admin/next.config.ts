import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@repo/ui", "@repo/property-rules"],
};

export default nextConfig;
