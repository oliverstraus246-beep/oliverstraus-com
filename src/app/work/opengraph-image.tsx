import { ImageResponse } from "next/og";
import { VENTURES } from "@/lib/ventures";

export const alt = "Oliver Straus — Selected Work";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// OG card for the /work venture hub. The venture detail pages each render
// their own per-venture card via work/[slug]/opengraph-image.tsx; without
// this file the hub's openGraph override (set in work/page.tsx) had no
// image at all, so sharing /work produced a card with no preview. Same
// dark + accent-blue palette and generated-not-photographed approach as
// the root and venture images.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#08090B",
          color: "#F5F6F7",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#6fa3ed",
            marginBottom: 24,
          }}
        >
          Selected Work · Oliver Straus
        </div>
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>
          {`${VENTURES.length} ventures.`}
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8, color: "#c9ccd3" }}>
          Built, run, or led solo.
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#8b8f98",
            marginTop: 28,
            maxWidth: 980,
            lineHeight: 1.4,
          }}
        >
          A chronological look at the companies, tools, and systems.
        </div>
      </div>
    ),
    { ...size },
  );
}