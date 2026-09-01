/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    // The PDF generator reads the Hebrew TTFs and the official form templates
    // from disk at runtime, so they must ship with the serverless bundle.
    outputFileTracingIncludes: {
      "/business": ["./assets/fonts/**", "./public/templates/*.pdf"],
      "/business/**": ["./assets/fonts/**", "./public/templates/*.pdf"],
    },
  },
};

export default nextConfig;
