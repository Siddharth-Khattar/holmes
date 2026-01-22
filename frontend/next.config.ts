// ABOUTME: Next.js configuration for Holmes frontend
// ABOUTME: Sets standalone output for Docker deployment and configures app settings

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: "standalone",

  // Turbopack config for monorepo Docker builds
  turbopack: {
    root: "..",
  },
};

export default nextConfig;
