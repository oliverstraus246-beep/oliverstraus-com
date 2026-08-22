"use client";

// The "View details" affordance on each venture card used to open something
// like this and stopped working; this is a real, working replacement, not
// a restyle of dead markup. Reuses only text already established and
// approved elsewhere on the site -- no new claims, just a more spacious
// presentation of the same facts.
import { useEffect, useRef } from "react";

export interface Venture {
  role: string;
  name: string;
  description: string;
  timeframe?: string | null;
  stack?: readonly string[];
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function VentureModal({
  venture,
  onClose,
}: {
  venture: Venture;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      data-testid="venture-modal-backdrop"
      onClick={onClose}
      className={`fixed inset-0 z-[150] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm ${
        prefersReducedMotion() ? "" : "animate-modal-backdrop-in"
      }`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="venture-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg border border-border bg-card p-10 outline-none ${
          prefersReducedMotion() ? "" : "animate-modal-panel-in"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-6 top-6 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue focus-visible:text-accent-blue focus-visible:outline-none"
        >
          Close &times;
        </button>
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {venture.role}
          </p>
          {venture.timeframe && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {venture.timeframe}
            </p>
          )}
        </div>
        <h3 id="venture-modal-title" className="mt-3 text-3xl font-bold tracking-tight">
          {venture.name}
        </h3>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          {venture.description}
        </p>
        {venture.stack && venture.stack.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Stack
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {venture.stack.map((tech) => (
                <span
                  key={tech}
                  className="border border-border px-2.5 py-1 font-mono text-xs text-foreground/80"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
