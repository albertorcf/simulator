import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    eslint: {  // ***Para reabilitar o ESLint depois, basta remover ou comentar essa seção eslint
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true, 
  },
};

export default nextConfig;
