import type { NextConfig } from "next";

const buildTime = new Date().toISOString();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: '1.1.0',
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
};

export default nextConfig;
