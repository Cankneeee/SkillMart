// next.config.js

const isProd = process.env.NODE_ENV === 'production';

// Only require and configure next-pwa for production builds
const withPWA = isProd
  ? require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      // disable: false, // Explicitly enable for production
      // You might want to add other production-specific PWA options here
    })
  : (config) => config; // Pass through config as-is in development

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jygdgxucssqdwtcdcvsr.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Disable TypeScript and ESLint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Note: PWA features will only be active in the production build.
};

// Apply the PWA wrapper conditionally
module.exports = withPWA(nextConfig);
