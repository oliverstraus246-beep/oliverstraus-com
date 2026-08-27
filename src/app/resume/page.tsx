import type { Metadata } from "next";
import Link from "next/link";
import { ResumeContent } from "@/components/resume-content";
import { ResumePresetPicker } from "@/components/resume-preset-picker";
import { ResumePrintButton } from "@/components/resume-print-button";

const FULL_TITLE = "Résumé | Oliver Straus";
const DESCRIPTION = "Oliver Straus's résumé — appointed CFO at 14, builder since. Skills, education, and professional experience.";

export const metadata: Metadata = {
  title: "Résumé",
  description: DESCRIPTION,
  alternates: { canonical: "/resume" },
  // openGraph/twitter replace the root layout's values field for field (a
  // child route's object entirely REPLACES the parent's -- verified on the
  // venture pages), so without this /resume inherited the homepage's card
  // (title "Oliver Straus", url "/", homepage description). The image comes
  // from resume/opengraph-image.tsx below, same file convention as the
  // venture and root images.
  openGraph: {
    title: FULL_TITLE,
    description: DESCRIPTION,
    url: "https://oliverstraus.com/resume",
    siteName: "Oliver Straus",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: FULL_TITLE,
    description: DESCRIPTION,
  },
};

// Real, crawlable fallback destination -- every "Resume" trigger point
// intercepts the click to open the in-page modal instead (see
// resume-modal.tsx), but this route still works directly (no-JS, "open
// in new tab", copy link) and is what window.print() targets when
// reached this way rather than through the modal.
export default function ResumePage() {
  return (
    <main className="resume-page-main mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
      <div className="no-print mb-6">
        {/* Actions row: Back + Print. The preset picker sits inline on sm+
            and drops to its own scrollable row on mobile (below) so the four
            style buttons don't wrap into a tall block -- mirrors the résumé
            modal header for a consistent compact mobile layout. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            // py-1.5 -my-1.5 enlarges the tap target to ~28px (WCAG 2.2 AA 24px
            // minimum) with the negative margin cancelling the box growth so
            // the link's visual position is unchanged.
            className="inline-flex items-center py-1.5 -my-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
          >
            &larr; Back
          </Link>
          <div className="hidden sm:block">
            <ResumePresetPicker />
          </div>
          <ResumePrintButton />
        </div>
        {/* Mobile-only preset row: horizontally scrollable, never wraps. */}
        <div className="mt-3 sm:hidden">
          <ResumePresetPicker className="overflow-x-auto" />
        </div>
      </div>
      <div className="resume-page-card overflow-hidden rounded-2xl shadow-2xl">
        <ResumeContent />
      </div>
    </main>
  );
}
