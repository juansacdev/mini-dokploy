/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-auth is server-only and pulls in adapters (kysely) that don't bundle cleanly.
  // Keep it external so it's required from node_modules at runtime instead of bundled.
  serverExternalPackages: ["better-auth"],
}

export default nextConfig
