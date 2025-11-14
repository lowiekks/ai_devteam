/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ae01.alicdn.com', 'aliexpress.com', 'cdn.shopify.com'],
  },
  // Skip build-time validation of environment variables for Firebase
  env: {
    SKIP_ENV_VALIDATION: '1',
  },
  webpack: (config, { isServer }) => {
    // Exclude undici and other problematic dependencies from webpack processing
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    // Exclude undici from being processed by webpack
    config.externals = config.externals || []
    config.externals.push({
      'undici': 'commonjs undici',
    })

    return config
  },
}

module.exports = nextConfig
