/**
 * A missing Supabase URL silently turns the whole app into demo mode, which in
 * production means serving mock data to paying customers without any error. A
 * production build must therefore either be configured or opt into demo mode
 * explicitly.
 */
function assertBackendConfigured() {
  if (process.env.VERCEL_ENV !== "production") return;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return;

  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter(
    (name) => !process.env[name],
  );

  if (missing.length > 0) {
    throw new Error(
      `Production build is missing ${missing.join(", ")}. Set them, or set ` +
        "NEXT_PUBLIC_DEMO_MODE=true to publish the demo on purpose.",
    );
  }
}

assertBackendConfigured();

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
    serverActions: {
      // Document uploads travel through a server action as base64, which adds
      // a third to the file size. The default 1 MB rejects an ordinary phone
      // photo, and Vercel refuses any request body over 4.5 MB, so this sits
      // between the two. The browser downscales images to stay under it — see
      // lib/upload/prepare-file.ts.
      bodySizeLimit: "4mb",
    },
    // The PDF generator reads the Hebrew TTFs and the official form templates
    // from disk at runtime, so they must ship with the serverless bundle.
    outputFileTracingIncludes: {
      "/business": ["./assets/fonts/**", "./public/templates/*.pdf"],
      "/business/**": ["./assets/fonts/**", "./public/templates/*.pdf"],
    },
  },
};

export default nextConfig;
