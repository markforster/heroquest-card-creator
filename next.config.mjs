/** @type {import('next').NextConfig} */
const nextConfig = {
  // Always emit a static export that can be opened from
  // the filesystem or dropped into any folder on a server.
  output: "export",
  // Load Next runtime assets relative to the current page
  // so the bundle can live under any subpath.
  assetPrefix: "./",
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Required for `output: "export"` so images in `public/`
    // (like the app logo) are served as static files instead
    // of going through the Next.js image optimizer route.
    unoptimized: true,
  },
  webpack: (config) => {
    // Add rule for SVG files as React components via SVGR
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Allow importing font files (ttf/otf/woff/woff2) from the app
    // so they are bundled as static assets and can be referenced
    // via the emitted URL string (used in layout.tsx).
    config.module.rules.push({
      test: /\.(ttf|otf|woff|woff2|eot)$/i,
      type: "asset/resource",
      generator: {
        filename: "static/fonts/[name]-[hash][ext]",
      },
    });

    return config;
  },
  reactStrictMode: true,
};

export default nextConfig;
