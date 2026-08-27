import type { NextConfig } from "next";

// Nonce-based CSP is set per-request in src/proxy.ts. These are the headers
// that don't need a fresh value per request.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Superseded by CSP's frame-ancestors, kept as a legacy fallback.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Enables React's <ViewTransition> integration. Used in layout.tsx to
    // crossfade page content on client-side route navigations -- a subtle
    // premium touch, no slides. The header is anchored out of the
    // transition (see globals.css) so it never flickers, and the whole
    // thing is duration-zeroed under prefers-reduced-motion. Without
    // browser support the site works normally, transitions just don't
    // animate.
    viewTransition: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
