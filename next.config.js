const path = require('path');

const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['@supabase/supabase-js'],
  // Tree-shake huge icon/component libs so dev + prod payload stays small
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'cmdk',
      'sonner',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
  // Pin Turbopack workspace root so it stops scanning C:\Users\iamvi\package-lock.json
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
  // Serve PDFCraft static export under /clip — map clean URLs to index.html files
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/clip', destination: '/clip/index.html' },
        { source: '/clip/:path((?!_next/)[^/.]+)', destination: '/clip/:path/index.html' },
      ],
    };
  },
};

module.exports = nextConfig;
