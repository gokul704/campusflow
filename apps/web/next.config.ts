import type { NextConfig } from "next";
import { config as loadRootEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root (campusflow/) — dependencies are hoisted here; fixes server chunk tracing in npm workspaces. */
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Repo-root `.env` (DATABASE_URL, etc.) is not auto-loaded when you run `next dev` from apps/web only.
loadRootEnv({ path: path.join(monorepoRoot, ".env") });

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  // Allow campusflow.io subdomains + custom tenant domains for images
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.campusflow.io" },
      { protocol: "https", hostname: "campusflow-uploads.s3.ap-south-1.amazonaws.com" },
    ],
  },
};

export default nextConfig;
