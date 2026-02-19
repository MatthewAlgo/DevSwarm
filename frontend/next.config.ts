import type { NextConfig } from "next";

const configuredPublicApi = process.env.NEXT_PUBLIC_API_URL?.replace(
  /\/api\/?$/,
  "",
);
const backendOrigin =
  process.env.API_INTERNAL_URL ??
  process.env.BACKEND_ORIGIN ??
  configuredPublicApi ??
  "http://localhost:8080";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
