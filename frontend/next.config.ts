import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
    ],
    // Use unoptimized images for Cloudflare Pages (no built-in image optimization)
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // Required for Cloudflare Pages deployment
  output: 'standalone',
};

export default nextConfig;
