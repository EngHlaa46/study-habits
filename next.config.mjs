/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["node-ical"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "study-skills-builder.onrender.com" }],
        destination: "https://studyskillsbuilder.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
