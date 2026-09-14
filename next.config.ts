import type { NextConfig } from "next";

const buildTime = new Date().toISOString();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: '1.1.1',
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
  experimental: {
    serverActions: {
      // Raised from default 1MB to support large DOCX uploads (some JDs are > 1MB)
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
