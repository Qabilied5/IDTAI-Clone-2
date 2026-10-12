/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deploy target: self-hosted Node single process (bukan serverless).
  // instrumentationHook menyalakan src/instrumentation.ts saat server boot
  // (polling Telegram, cek stall, polling Calendly) — pengganti app.listen().
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["pdf-parse", "mammoth", "xlsx"],
  },
};

module.exports = nextConfig;
