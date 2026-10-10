import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/export/reports-pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
