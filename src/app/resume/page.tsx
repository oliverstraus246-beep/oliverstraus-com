import type { Metadata } from "next";
import Link from "next/link";
import { ResumeContent } from "@/components/resume-content";
import { ResumePrintButton } from "@/components/resume-print-button";

export const metadata: Metadata = {
  title: "Résumé",
  description: "Oliver Straus's résumé.",
};

// Real, crawlable fallback destination -- every "Resume" trigger point
// intercepts the click to open the in-page modal instead (see
// resume-modal.tsx), but this route still works directly (no-JS, "open
// in new tab", copy link) and is what window.print() targets when
// reached this way rather than through the modal.
export default function ResumePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
        >
          &larr; Back
        </Link>
        <ResumePrintButton />
      </div>
      <div className="overflow-hidden rounded-2xl shadow-2xl">
        <ResumeContent />
      </div>
    </main>
  );
}
