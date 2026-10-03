"use client";

import { useEffect, useRef, useState } from "react";
import { LINUX_PLATFORMS, type LinuxPlatform, type Platform } from "@/lib/downloads";
import { VENTURES } from "@/lib/ventures";

const OPEN_EVENT = "open-download";

const PLATFORM_LABELS: Record<Platform, string> = {
  mac: "macOS",
  linux: "Other Linux (.tar.gz)",
  windows: "Windows",
  arch: "Arch Linux",
  debian: "Debian / Ubuntu",
};

// Top-level groups shown on the first screen. "linux" here is the GROUP
// (clicking it opens the arch/debian/linux sub-step below), distinct from
// the "linux" Platform value (the generic-tarball fallback, one of the
// three choices inside that sub-step).
type OsGroup = "mac" | "linux" | "windows";
const OS_GROUPS: { group: OsGroup; label: string; platform?: Platform }[] = [
  { group: "mac", label: "macOS", platform: "mac" },
  { group: "linux", label: "Linux" },
  { group: "windows", label: "Windows", platform: "windows" },
];

// Best-effort client-side OS detection, used only to highlight a likely
// match -- never to skip the explicit pick. navigator.userAgentData is the
// modern, more honest source where Chromium exposes it; userAgent is the
// fallback for Firefox/Safari. Returns null (no highlight) rather than
// guessing when neither gives a clear signal -- matches the original
// "explicit pick over UA-sniffing" reasoning, this is a convenience hint
// layered on top of it, not a replacement.
function detectOsGroup(): OsGroup | null {
  if (typeof navigator === "undefined") return null;
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData;
  const source = (uaData?.platform ?? navigator.userAgent ?? "").toLowerCase();
  if (source.includes("mac")) return "mac";
  if (source.includes("win")) return "windows";
  if (source.includes("linux") || source.includes("x11")) return "linux";
  return null;
}

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
  // "top" is the macOS/Linux/Windows screen; "linux" is the
  // arch/debian/linux sub-step. Reset to "top" every time the modal opens
  // so a prior visit's sub-step choice never lingers into the next open.
  const [view, setView] = useState<"top" | "linux">("top");
  const [detected, setDetected] = useState<OsGroup | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ project: string }>).detail;
      setProject(detail.project);
      setView("top");
      setDetected(detectOsGroup());
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!project) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // First Escape backs out of the Linux sub-step (mirrors the Back
      // button); only a second Escape (or one from the top step) closes
      // the whole modal.
      setView((v) => {
        if (v === "linux") return "top";
        setProject(null);
        return v;
      });
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
          <div className="flex items-center gap-2">
            {view === "linux" && (
              <button
                type="button"
                onClick={() => setView("top")}
                aria-label="Back"
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-accent-blue"
              >
                &larr;
              </button>
            )}
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {view === "top" ? "Choose your OS" : "Choose a Linux format"}
            </p>
          </div>
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
          {view === "top"
            ? OS_GROUPS.map(({ group, label, platform }) => {
                const isDetected = detected === group;
                const content = (
                  <>
                    <span className="flex items-center gap-2">
                      {label}
                      {isDetected && (
                        <span className="rounded-full border border-accent-blue/40 px-1.5 py-0.5 text-[10px] text-accent-blue">
                          Detected
                        </span>
                      )}
                    </span>
                    <span aria-hidden="true">&rarr;</span>
                  </>
                );
                const className = `flex items-center justify-between rounded-full border px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors active:scale-[0.98] ${
                  isDetected
                    ? "border-accent-blue/60 text-foreground"
                    : "border-border text-foreground/80 hover:border-accent-blue hover:text-accent-blue"
                }`;
                return platform ? (
                  <a key={group} href={`/api/download/${project}?platform=${platform}`} className={className}>
                    {content}
                  </a>
                ) : (
                  <button key={group} type="button" onClick={() => setView("linux")} className={className}>
                    {content}
                  </button>
                );
              })
            : LINUX_PLATFORMS.map((platform: LinuxPlatform) => (
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
