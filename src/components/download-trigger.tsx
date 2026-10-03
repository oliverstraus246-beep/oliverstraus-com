"use client";

import { openDownload } from "@/components/download-modal";

/** Small client island so the (server-rendered) venture detail page can
 * still dispatch the download-modal's open event. */
export function DownloadTrigger({ project }: { project: string }) {
  return (
    <button
      type="button"
      onClick={() => openDownload(project)}
      className="inline-flex items-center gap-1.5 self-start rounded-full border border-border bg-card px-4 py-2 font-mono text-xs uppercase tracking-widest text-foreground/80 transition-colors hover:border-accent-blue hover:text-accent-blue active:scale-[0.98]"
    >
      Download
      <span aria-hidden="true">&rarr;</span>
    </button>
  );
}
