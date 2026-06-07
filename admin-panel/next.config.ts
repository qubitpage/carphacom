import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/app",
  
  // Skip TS and eslint checks during build (speeds up significantly)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // Image optimization configuration
  images: {
    unoptimized: true, // Disable image optimization to avoid 400 errors
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'demo2.qubitpage.com',
      },
      {
        protocol: 'https',
        hostname: 'admin.demo2.qubitpage.com',
      },
    ],
  },
  
  experimental: {
    serverActions: {
      allowedOrigins: ["statiiinfotrafic.ro", "www.statiiinfotrafic.ro"],
      bodySizeLimit: '50mb',
    },
  },
  
  // Unique build ID for cache busting
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  
  // No-cache headers for all routes
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "-1" },
        ],
      },
    ];
  },
};

export default nextConfig;
