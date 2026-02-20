import type { NextConfig } from "next";

const configuredPublicApi = process.env.NEXT_PUBLIC_API_URL?.replace(
  /\/api\/?$/,
  "",
);
const requestedBackendOrigin =
  process.env.API_INTERNAL_URL ??
  process.env.BACKEND_ORIGIN ??
  configuredPublicApi ??
  "http://localhost:8080";

const normalizedBackendOrigin = requestedBackendOrigin.replace(/\/+$/, "");
const pointsAtFrontendDevServer = /^(https?:\/\/)?(localhost|127\.0\.0\.1):3000$/i.test(
  normalizedBackendOrigin,
);
const backendOrigin = pointsAtFrontendDevServer
  ? "http://localhost:8080"
  : normalizedBackendOrigin;

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
