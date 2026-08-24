"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type ThemeMode = "dark" | "light";
export type ThemeAccent = "blue" | "amber" | "violet" | "emerald";

const ACCENTS: ReadonlyArray<{ id: ThemeAccent; label: string; swatch: string }> = [
  { id: "blue", label: "Blue", swatch: "#2f6fe0" },
  { id: "amber", label: "Amber", swatch: "#d9a441" },
  { id: "violet", label: "Violet", swatch: "#8b6fe0" },
  { id: "emerald", label: "Emerald", swatch: "#2fa86c" },
];

function applyTheme(mode: ThemeMode, accent: ThemeAccent) {
  document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.accent = accent;
}

/**
 * Dark/light + accent-color picker. Persisted to localStorage and applied
 * via [data-theme]/[data-accent] on <html> -- see the blocking
 * beforeInteractive script in layout.tsx for the flash-free initial paint,
 * and the corresponding CSS blocks in globals.css. Default state here
 * (dark/blue) matches what that script and globals.css's bare :root both
 * assume, so a slow hydration never visibly disagrees with itself.
 */
export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [accent, setAccent] = useState<ThemeAccent>("blue");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedMode = localStorage.getItem("theme");
    const storedAccent = localStorage.getItem("accent");
    if (storedMode === "dark" || storedMode === "light") setMode(storedMode);
    if (
      storedAccent === "blue" ||
      storedAccent === "amber" ||
      storedAccent === "violet" ||
      storedAccent === "emerald"
    ) {
      setAccent(storedAccent);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function chooseMode(next: ThemeMode) {
    setMode(next);
    localStorage.setItem("theme", next);
    applyTheme(next, accent);
  }

  function chooseAccent(next: ThemeAccent) {
    setAccent(next);
    localStorage.setItem("accent", next);
    applyTheme(mode, next);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme settings"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-150 hover:border-accent-blue hover:text-accent-blue"
      >
        {mode === "dark" ? (
          <Moon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Sun className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme settings"
          className="animate-modal-panel-in absolute right-0 top-12 z-[80] w-56 rounded-xl border border-border bg-card p-3 shadow-2xl"
        >
          <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Appearance
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => chooseMode("dark")}
              aria-pressed={mode === "dark"}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-xs transition-colors duration-150 active:scale-95 ${
                mode === "dark"
                  ? "border-accent-blue text-accent-blue"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              Dark
            </button>
            <button
              type="button"
              onClick={() => chooseMode("light")}
              aria-pressed={mode === "light"}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-xs transition-colors duration-150 active:scale-95 ${
                mode === "light"
                  ? "border-accent-blue text-accent-blue"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              Light
            </button>
          </div>

          <p className="mt-4 px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Accent
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => chooseAccent(a.id)}
                aria-label={`${a.label} accent`}
                aria-pressed={accent === a.id}
                className="relative flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-90"
              >
                <span
                  className="h-5 w-5 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: a.swatch }}
                />
                {accent === a.id && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0.5 rounded-full ring-2 ring-accent-blue"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
