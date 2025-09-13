
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    config.cache = false;
    return config;
  },
  async headers() {
    return [
      {
        source: '/extension.zip',
        headers: [
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="extension.zip"',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
