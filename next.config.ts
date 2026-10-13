import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Necessário para a imagem Docker de produção (server.js standalone).
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
