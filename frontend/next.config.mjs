/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server in .next/standalone for small Docker images.
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // react-pdf ships its own font/layout engines; load it from node_modules instead of bundling it.
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    // pdfkit loads its built-in font metrics (Helvetica…) through a computed require that the
    // standalone tracer can't follow, so ship them explicitly with the pay slip routes.
    outputFileTracingIncludes: {
      "/api/payslips/**": ["./node_modules/pdfkit/js/standard-fonts/**"],
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
