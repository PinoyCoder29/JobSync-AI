/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // mammoth (DOCX) loads files dynamically; keep it out of the server bundle so it works reliably
  serverExternalPackages: ["mammoth"],
  // keep old bookmarks working
  async redirects() {
    return [{ source: "/analyzer", destination: "/resume-analyzer", permanent: true }];
  },
};
export default nextConfig;
