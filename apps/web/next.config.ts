import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    authInterrupts: true, // enables forbidden() / app/forbidden.tsx
  },
};

export default nextConfig;
