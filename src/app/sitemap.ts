import type { MetadataRoute } from "next";
import { VENTURES } from "@/lib/ventures";

// Generated from the real route list -- venture pages come straight from
// VENTURES (the same source of truth the site itself renders from), so
// this can never drift into listing removed ventures or missing new ones
// the way the old hand-maintained public/sitemap.xml did.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://oliverstraus.com";

  return [
    { url: base, changeFrequency: "monthly", priority: 1.0 },
    { url: `${base}/resume`, changeFrequency: "monthly", priority: 0.6 },
    // The venture hub. Lower priority than the individual ventures (which
    // carry the actual content) but high enough to be crawled as their
    // index parent.
    { url: `${base}/work`, changeFrequency: "monthly", priority: 0.7 },
    ...VENTURES.map((venture) => ({
      url: `${base}/work/${venture.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
