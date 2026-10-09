import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir:
    // Local launcher only; not a deployed build profile.
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    process.env.VALORAR_DATABASE_ENV === "realdata"
      ? ".next-realdata"
      : ".next",
  poweredByHeader: false,
  transpilePackages: ["@repo/ui", "@repo/property-rules", "@repo/rbac"],
};

export default nextConfig;
