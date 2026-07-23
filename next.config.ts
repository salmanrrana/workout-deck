import type { NextConfig } from "next";

const verificationDistDir = process.env.BRAIN_DUMP_VERIFY_BOOT
  ? ".next/verify"
  : ".next";

const nextConfig: NextConfig = {
  // Verification may run alongside a developer's server; isolate Next's dev lock.
  distDir: verificationDistDir,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default nextConfig;
