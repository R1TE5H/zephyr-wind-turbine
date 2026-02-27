import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["serialport", "@serialport/bindings-cpp"],
  turbopack: {},
};

export default nextConfig;
