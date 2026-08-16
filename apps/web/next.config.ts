import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 builds with Turbopack; wagmi/viem need no bundler shims there.
  turbopack: {},
};

export default nextConfig;
