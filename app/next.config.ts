import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@remotion/renderer',
    '@remotion/bundler',
    'puppeteer-core',
    '@remotion/compositor-darwin-arm64',
    '@remotion/compositor-darwin-x64',
  ],
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
};

export default nextConfig;
