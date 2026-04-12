/** @type {import('next').NextConfig} */
const nextConfig = {
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
