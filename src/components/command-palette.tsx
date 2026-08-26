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
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q),
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
    } else {
      // Restore focus to the trigger when the palette closes -- the
      // activedescendant pattern leaves focus on the input, so hand it
      // back to the trigger so keyboard users don't lose their place.
      triggerRef.current?.focus();
    }
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
              {filtered.length === 0 && (
                <li className="px-4 py-6 text-center font-mono text-sm text-muted-foreground">
                  No matches.
                </li>
              )}
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
          </div>
        </div>
      )}
    </>
  );
}