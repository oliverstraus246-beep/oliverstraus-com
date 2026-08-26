import { ImageResponse } from "next/og";
import { VENTURES, getVenture } from "@/lib/ventures";

export const alt = "Oliver Straus — Venture";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return VENTURES.map((v) => ({ slug: v.slug }));
}

// Per-venture card instead of the root's generic one -- sharing a link to
// a specific venture page (e.g. /work/sectra) on social/iMessage/Slack
// should show that venture's real name, role, and description, not just
// "Oliver Straus" for every URL on the site. Same dark + accent-blue
// palette and generated-not-photographed approach as the root image.
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venture = getVenture(slug);
  const name = venture?.name ?? "Oliver Straus";
  const role = venture?.role ?? "Builder";
  const description = venture?.description ?? "";

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
          {`${role} · Oliver Straus`}
        </div>
        <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.05 }}>
          {name}
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#8b8f98",
            marginTop: 28,
            maxWidth: 980,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
    ),
    { ...size },
  );
}
