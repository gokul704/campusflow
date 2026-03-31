import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid Segment Explorer devtool (SegmentViewNode) — can throw
  // "Could not find ... segment-explorer-node.js#SegmentViewNode in the React Client Manifest"
  // in dev (Next 15 + RSC bundler). Disabling only affects the route segment panel in devtools.
  experimental: {
    devtoolSegmentExplorer: false,
  },
  // Allow campusflow.io subdomains + custom tenant domains for images
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.campusflow.io" },
      { protocol: "https", hostname: "campusflow-uploads.s3.ap-south-1.amazonaws.com" },
    ],
  },
};

export default nextConfig;
