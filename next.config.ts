import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure shapefile binary parsing works correctly in the browser bundle
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      stream: false,
    };
    return config;
  },
};

export default nextConfig;
