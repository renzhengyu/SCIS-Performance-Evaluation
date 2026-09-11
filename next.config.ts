import type { NextConfig } from "next";

const buildTime = new Date().toISOString();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: '1.1.0',
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
  experimental: {
    serverActions: {
      // Default is 1MB — increase to 20MB to support large DOCX JD uploads
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
