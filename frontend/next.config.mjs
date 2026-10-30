/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server in .next/standalone for small Docker images.
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // react-pdf ships its own font/layout engines and exceljs relies on Node streams: load both from
    // node_modules instead of bundling them.
    serverComponentsExternalPackages: ["@react-pdf/renderer", "exceljs"],
    // Spreadsheet uploads for employee import (the parser itself caps files at 2 MB).
    serverActions: { bodySizeLimit: "3mb" },
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
