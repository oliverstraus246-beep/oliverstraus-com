"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VENTURES } from "@/lib/ventures";
import { PLATFORMS } from "@/components/social-links";
import { openResume } from "@/components/resume-modal";

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

const EMAIL = "oliverstraus246@gmail.com";

// Lowercase + strip combining diacritics so the palette's filter is
// accent-insensitive: "resume" matches "View Résumé". NFD decomposes
// accented letters into their base + combining mark, then the regex
// removes the combining marks (U+0300-U+036F), leaving the base letter.
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Cmd/Ctrl+K quick-nav palette -- jump to any section, venture, or link
 * without touching the mouse. Fits the terminal aesthetic already
 * established (boot sequence, career.log, contact.sh).
 *
 * Accessibility: implemented as an ARIA 1.2 combobox. The input owns the
 * single focus; the results are a listbox of role="option" items the input
 * points at via aria-activedescendant, so a screen-reader user hears which
 * item is active as they arrow through and Enter selects it. Tab is trapped
 * inside the dialog while open, and focus returns to the trigger on close.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Tracks whether the palette was open on the previous render, so the
  // focus-restore effect below only fires on a real open->close transition
  // -- not on initial mount (where open starts false and the else-branch
  // would otherwise focus the trigger, hijacking initial page focus).
  const wasOpenRef = useRef(false);
  const router = useRouter();

  const items = useMemo<CommandItem[]>(() => {
    function go(href: string) {
      if (href.startsWith("/#") && window.location.pathname === "/") {
        document.querySelector(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push(href);
      }
    }

    const core: CommandItem[] = [
      { id: "nav-work", label: "Go to Work", hint: "Section", run: () => go("/#work") },
      { id: "nav-timeline", label: "Go to Timeline", hint: "Section", run: () => go("/#timeline") },
      { id: "nav-about", label: "Go to About", hint: "Section", run: () => go("/#about") },
      { id: "nav-skills", label: "Go to Stack", hint: "Section", run: () => go("/#skills") },
      { id: "nav-contact", label: "Go to Contact", hint: "Section", run: () => go("/#contact") },
      {
        id: "resume",
        label: "View Résumé",
        hint: "Open",
        run: () => openResume(),
      },
      {
        id: "email",
        label: "Copy Email Address",
        hint: EMAIL,
        run: () => {
          navigator.clipboard.writeText(EMAIL);
          setCopied(true);
        },
      },
    ];

    const ventures: CommandItem[] = VENTURES.map((v) => ({
      id: `venture-${v.slug}`,
      label: v.name,
      hint: "Venture",
      run: () => go(`/work/${v.slug}`),
    }));

    const social: CommandItem[] = PLATFORMS.map((p) => ({
      id: `social-${p.label}`,
      label: `Open ${p.label}`,
      hint: p.href.replace(/^https?:\/\//, ""),
      run: () => window.open(p.href, "_blank", "noopener,noreferrer"),
    }));

    return [...core, ...ventures, ...social];
  }, [router]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    // Case- and accent-insensitive match so "resume" finds "View Résumé" --
    // the résumé item's label carries an accent that a plain
    // .toLowerCase().includes() misses, sending the most common spelling
    // to "No matches." fold() strips combining diacritics (NFD + remove
    // the combining mark range) on both the query and each label/hint.
    const q = fold(query);
    return items.filter(
      (item) => fold(item.label).includes(q) || fold(item.hint).includes(q),
    );
  }, [items, query]);

  const listId = "command-palette-list";
  const optionId = (i: number) => `command-palette-option-${i}`;

  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    setCopied(false);
  }

  function select(item: CommandItem | undefined) {
    if (!item) return;
    item.run();
    if (item.id !== "email") close();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        select(filtered[activeIndex]);
      } else if (e.key === "Tab") {
        // Focus trap: keep Tab cycling back to the input (the only focusable
        // element in the dialog). Options are navigated by arrow keys + aria-
        // activedescendant, not Tab, per the combobox pattern.
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, activeIndex]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      // Lock background scroll while the modal overlay is open, matching
      // the nav menu and résumé modal. The palette is role="dialog"
      // aria-modal="true", so a wheel/gesture scrolling the page behind
      // the fixed overlay is a real-focus leak out of the dialog.
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      wasOpenRef.current = true;
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
    if (wasOpenRef.current) {
      // Restore focus to the trigger on a real close (open was true), not
      // on initial mount. Focusing the trigger on mount hijacked initial
      // page focus -- the skip-to-content link and the early nav links were
      // unreachable by Tab because focus started on the ⌘K button
      // mid-document. Skip the restore when the trigger is hidden (mobile:
      // the button is display:none below the sm: breakpoint) so focus
      // doesn't land on an invisible element -- it falls back to <body> as
      // the palette's input unmounts.
      const trigger = triggerRef.current;
      if (trigger && trigger.offsetParent !== null) trigger.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  function handleQueryChange(next: string) {
    setQuery(next);
    setActiveIndex(0);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-11 items-center gap-1.5 rounded-full border border-border px-3.5 font-mono text-[11px] text-muted-foreground transition-colors duration-150 hover:border-accent-blue hover:text-accent-blue sm:flex"
        aria-label="Open command palette"
        aria-keyshortcuts="Meta+K"
      >
        <span aria-hidden="true">⌘</span>K
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-background/80 px-6 pt-[15vh] backdrop-blur-sm"
          onClick={close}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="font-mono text-accent-blue" aria-hidden="true">
                $
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={filtered.length ? optionId(activeIndex) : undefined}
                aria-autocomplete="list"
                placeholder="Jump to a section, venture, or link..."
                className="w-full bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Esc
              </span>
            </div>

            <ul
              id={listId}
              role="listbox"
              aria-label="Commands"
              className="max-h-80 overflow-y-auto py-2"
            >
              {filtered.map((item, i) => (
                <li key={item.id} role="option" id={optionId(i)} aria-selected={i === activeIndex}>
                  <div
                    onClick={() => select(item)}
                    onMouseMove={() => setActiveIndex(i)}
                    className={`flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left font-mono text-sm transition-colors ${
                      i === activeIndex
                        ? "bg-accent-blue/10 text-accent-blue"
                        : "text-foreground/80"
                    }`}
                  >
                    <span>
                      {item.label}
                      {item.id === "email" && copied && (
                        <span className="ml-2 text-accent-blue-dim">Copied</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.hint}</span>
                  </div>
                </li>
              ))}
            </ul>
            {filtered.length === 0 && (
              // Outside the listbox: a bare <li> with no role="option"
              // inside role="listbox" is invalid ARIA (listbox children
              // must be options/groups). role="status" is an implicit
              // polite live region, so a screen-reader user hears
              // "No matches." announced when filtering yields nothing,
              // instead of an empty listbox with no explanation.
              <p
                role="status"
                className="px-4 py-6 text-center font-mono text-sm text-muted-foreground"
              >
                No matches.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}