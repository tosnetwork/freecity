/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TS source with NodeNext-style explicit ".js"
  // relative specifiers; transpile them and map ".js" back to ".ts".
  transpilePackages: ["@freecity/contracts", "@freecity/client-world"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
  async rewrites() {
    const apiOrigin = process.env.FREECITY_API_ORIGIN ?? "http://localhost:3001";
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
