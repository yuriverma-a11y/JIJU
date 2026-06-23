/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // When you wire the real private package, it may ship untranspiled TS/ESM.
  // Keeping it here is harmless if the package is absent.
  transpilePackages: ["@atlys/design-system"],
};

export default nextConfig;
