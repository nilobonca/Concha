/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_EXPORT === 'true' || process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  reactStrictMode: true,
  ...(isExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

module.exports = nextConfig;
