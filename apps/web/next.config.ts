import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow campusflow.io subdomains + custom tenant domains for images
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.campusflow.io" },
      { protocol: "https", hostname: "campusflow-uploads.s3.ap-south-1.amazonaws.com" },
    ],
  },
};

export default nextConfig;
