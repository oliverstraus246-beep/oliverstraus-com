import type { MetadataRoute } from "next";

// Real values only: colors match the site's actual default dark theme
// (--background / --accent-blue in globals.css), and the icon is the same
// real logo file already used for the browser tab icon (src/app/icon.png).
// Mainly matters for "Add to Home Screen" on mobile -- without this, a
// saved shortcut falls back to a generic bookmark icon and title instead
// of the real logo and name.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oliver Straus",
    short_name: "Oliver Straus",
    description:
      "Oliver Straus. Appointed CFO at 14. Security-focused software engineer and builder. Denver, Colorado.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090b",
    theme_color: "#08090b",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
