// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React StrictMode for development to prevent double rendering
  reactStrictMode: false,
  
  // Configure webpack for better hot module replacement
  webpack: (config, { isServer, dev }) => {
    if (dev && !isServer) {
      // Improve HMR reliability
      config.optimization.runtimeChunk = 'single';
      
      // Add additional HMR settings
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
        ignored: /node_modules/,
      };
    }
    return config;
  },
  
  // Configure image domains for external images
  images: {
    domains: ['192.168.18.70'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '192.168.18.70',
        port: '5000',
        pathname: '/**',
      },
    ],
  },
  
  // API rewrites
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "http://192.168.18.70:8080/api/:path*", // your LAN API
      },
      {
        source: "/events-api/:path*",
        destination: "http://192.168.18.70:5000/:path*", // Events API proxy
      },
      {
        source: "/events/:path*",
        destination: "http://192.168.18.70:5000/6/events/:path*", // Direct events API proxy
      },
      {
        source: "/images/:path*",
        destination: "http://192.168.18.70:5000/6/images/:path*", // Images proxy
      },
    ];
  },
};

export default nextConfig;
