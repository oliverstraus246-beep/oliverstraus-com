import { ImageResponse } from "next/og";

export const alt = "Oliver Straus — Entrepreneur, Software Engineer, Security-Focused Builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated, not a photo -- consistent with the rest of the site (no
// face, ever, per Oliver's explicit instruction). Same dark + accent-blue
// palette as the live site, kept restrained rather than decorative.
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
          Denver, Colorado
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>
          Oliver Straus
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#8b8f98",
            marginTop: 28,
          }}
        >
          Entrepreneur · Software Engineer · Security-Focused Builder
        </div>
      </div>
    ),
    { ...size },
  );
}
