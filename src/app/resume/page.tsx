import type { Metadata } from "next";
import { ResumeContent } from "@/components/resume-content";

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
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="overflow-hidden rounded-2xl shadow-2xl">
        <ResumeContent />
      </div>
    </main>
  );
}
