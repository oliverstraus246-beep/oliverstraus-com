"use client";

import { useEffect, useRef, useState } from "react";
import { PLATFORMS, type Platform } from "@/lib/downloads";
import { VENTURES } from "@/lib/ventures";

const OPEN_EVENT = "open-download";

const PLATFORM_LABELS: Record<Platform, string> = {
  mac: "macOS",
  linux: "Linux",
  windows: "Windows",
};

/** Any trigger point calls this instead of linking to a download URL directly. */
export function openDownload(project: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { project } }));
}

/**
 * Mounted once (see layout.tsx). Reuses the résumé modal's interaction
 * model -- global open event, focus trap, Escape-to-close, scroll lock,
 * focus restoration -- but a dark, site-matching look instead of the
 * résumé's deliberately light, paper-like surface.
 */
export function DownloadModal() {
  const [project, setProject] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ project: string }>).detail;
      setProject(detail.project);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!project) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setProject(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [project]);

  useEffect(() => {
    if (!project) return;
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const p = panelRef.current;
      if (!p) return;
      const nodes = Array.from(
        p.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ).filter((n) => {
        const rect = n.getBoundingClientRect();
        return n.offsetParent !== null && rect.width > 0 && rect.height > 0;
      });
      if (!nodes.length) {
        e.preventDefault();
        p.focus();
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === p) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onTab);
    return () => {
      window.removeEventListener("keydown", onTab);
      document.body.style.overflow = prevOverflow;
      const prev = previousFocusRef.current;
      if (prev && document.contains(prev)) {
        try {
          prev.focus();
        } catch {
          /* no longer focusable */
        }
      }
    };
  }, [project]);

  if (!project) return null;

  const venture = VENTURES.find((v) => v.downloads?.project === project);
  const license = venture?.downloads?.license;

  return (
    <div
      className="animate-modal-backdrop-in fixed inset-0 z-[95] flex items-start justify-center bg-background/80 px-6 pt-[15vh] backdrop-blur-sm"
      onClick={() => setProject(null)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Download ${venture?.name ?? project}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-panel-in w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Choose your OS
          </p>
          <button
            type="button"
            onClick={() => setProject(null)}
            aria-label="Close"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
          >
            Close
          </button>
        </div>
        <div className="flex flex-col gap-3 p-5">
          {PLATFORMS.map((platform) => (
            <a
              key={platform}
              href={`/api/download/${project}?platform=${platform}`}
              className="flex items-center justify-between rounded-full border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-foreground/80 transition-colors hover:border-accent-blue hover:text-accent-blue active:scale-[0.98]"
            >
              {PLATFORM_LABELS[platform]}
              <span aria-hidden="true">&rarr;</span>
            </a>
          ))}
        </div>
        <p className="border-t border-border px-5 py-4 text-xs leading-relaxed text-muted-foreground">
          By downloading, you agree to{" "}
          {license && (
            <>
              the{" "}
              <a
                href={license.url}
                target="_blank"
                rel="noreferrer"
                className="text-accent-blue hover:text-accent-blue-dim"
              >
                {license.name}
              </a>{" "}
              and{" "}
            </>
          )}
          our{" "}
          <a href="/terms" className="text-accent-blue hover:text-accent-blue-dim">
            Terms
          </a>
          .
        </p>
      </div>
    </div>
  );
}
