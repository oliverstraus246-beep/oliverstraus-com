"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export type ThemeMode = "dark" | "light";
export type ThemeAccent = "blue" | "amber" | "violet" | "emerald";

const ACCENTS: ReadonlyArray<{ id: ThemeAccent; label: string; swatch: string }> = [
  { id: "blue", label: "Blue", swatch: "#2f6fe0" },
  { id: "amber", label: "Amber", swatch: "#d9a441" },
  { id: "violet", label: "Violet", swatch: "#8b6fe0" },
  { id: "emerald", label: "Emerald", swatch: "#2fa86c" },
];

const THEME_CHANGE_EVENT = "theme-change";

// Module-scope: writing to document.documentElement.dataset from inside a
// component trips react-hooks/immutability (modifying a global defined
// outside the hook). Kept out here as a plain helper so the component just
// calls it, same as the original applyTheme.
function applyToDom(mode: ThemeMode, accent: ThemeAccent) {
  document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.accent = accent;
}

function readMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem("theme") === "light" ? "light" : "dark";
}

function readAccent(): ThemeAccent {
  if (typeof window === "undefined") return "blue";
  const a = window.localStorage.getItem("accent");
  return a === "amber" || a === "violet" || a === "emerald" ? a : "blue";
}

function subscribeTheme(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
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
  // Theme + accent are read from localStorage via useSyncExternalStore rather
  // than useState + a mount effect that calls setState (which the
  // react-hooks/set-state-in-effect rule flags). The blocking
  // beforeInteractive script in layout.tsx sets data-theme/data-accent on
  // <html> before first paint, so the page is already correct visually; this
  // state just mirrors that for the switcher's own UI (the Moon/Sun icon,
  // the checked swatch). The server snapshot returns the default so
  // hydration matches, and the real persisted value is picked up cleanly
  // post-hydration. Snapshots return primitives, so Object.is keeps them
  // stable (no re-render loop).
  const mode = useSyncExternalStore(subscribeTheme, readMode, () => "dark" as ThemeMode);
  const accent = useSyncExternalStore(subscribeTheme, readAccent, () => "blue" as ThemeAccent);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Focus management: move focus into the menu when it opens (first item),
  // and hand it back to the trigger when it closes -- same pattern as the nav
  // overlay, so keyboard users get a predictable path instead of losing focus.
  const didOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      didOpenRef.current = true;
      const firstItem = rootRef.current?.querySelector<HTMLElement>("[role='menuitemradio'], [role='menuitem']");
      firstItem?.focus();
    } else if (didOpenRef.current) {
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // Tab dismisses the dropdown and moves focus to the next control
      // naturally (per the menu pattern) -- without this, Tab leaves the
      // menu open while focus moves out from under it.
      if (e.key === "Tab") {
        setOpen(false);
        return;
      }
      // Arrow-key roving between the menu's radio items, per the menu
      // pattern. Home/End jump to the first/last; arrows move by one.
      const items = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>("[role='menuitemradio']") ?? [],
      );
      if (items.length === 0) return;
      const currentIndex = items.findIndex((el) => el === document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Persist + apply: write the DOM dataset (the actual styling hook), write
  // localStorage, and dispatch the change event so useSyncExternalStore
  // re-snapshots and this component's mode/accent re-render. No local
  // setState -- the store is the single source of truth.
  function persist(nextMode: ThemeMode, nextAccent: ThemeAccent) {
    applyToDom(nextMode, nextAccent);
    window.localStorage.setItem("theme", nextMode);
    window.localStorage.setItem("accent", nextAccent);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  function chooseMode(next: ThemeMode) {
    persist(next, accent);
  }

  function chooseAccent(next: ThemeAccent) {
    persist(mode, next);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme settings"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-150 hover:border-accent-blue hover:text-accent-blue"
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
          <div role="group" aria-label="Appearance" className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={mode === "dark"}
              onClick={() => chooseMode("dark")}
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
              role="menuitemradio"
              aria-checked={mode === "light"}
              onClick={() => chooseMode("light")}
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
          <div role="group" aria-label="Accent color" className="mt-2 flex items-center gap-1.5">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="menuitemradio"
                aria-checked={accent === a.id}
                aria-label={`${a.label} accent`}
                onClick={() => chooseAccent(a.id)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-90"
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
