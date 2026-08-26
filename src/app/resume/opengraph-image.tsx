import { ImageResponse } from "next/og";

export const alt = "Oliver Straus — Résumé";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Sharing /resume (the standalone résumé route) used to render the
// homepage's OG card, since the page's metadata inherited the root's
// openGraph before resume/page.tsx set its own. The page now sets its
// own openGraph fields; this file provides the image via the same
// file convention as the root and venture images. Same dark + accent-blue
// palette, generated not photographed.
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
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>
          Résumé
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#8b8f98",
            marginTop: 28,
            maxWidth: 980,
            lineHeight: 1.4,
          }}
        >
          Oliver Straus · Appointed CFO at 14, builder since. Skills, education, and professional experience.
        </div>
      </div>
    ),
    { ...size },
  );
}