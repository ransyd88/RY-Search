import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Workers serves the bundled public assets directly. Disabling
  // Next's runtime image optimizer avoids requests to the unsupported
  // `/_vinext/image` endpoint while preserving responsive image dimensions.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
