"use client";

import { useEffect, useState } from "react";
import { ResumeContent } from "@/components/resume-content";
import { ResumePresetPicker } from "@/components/resume-preset-picker";

const OPEN_EVENT = "open-resume";

/** Any trigger point calls this instead of linking to a file directly. */
export function openResume() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * Mounted once (see layout.tsx). Listens for the open-resume event so the
 * nav overlay, footer, hero CTA, and command palette can all open the same
 * modal without prop drilling. "Download" is a scoped window.print() --
 * see .resume-print-area in globals.css -- rather than a static file, so
 * it can never drift out of sync with the real content in resume.ts.
 */
export function ResumeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm sm:px-6"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Résumé"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-neutral-50 shadow-2xl"
      >
        <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/95 px-6 py-3 backdrop-blur-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
            Résumé
          </p>
          <ResumePresetPicker />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 transition-colors duration-150 hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close résumé"
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 transition-colors duration-150 hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
        <ResumeContent />
      </div>
    </div>
  );
}
