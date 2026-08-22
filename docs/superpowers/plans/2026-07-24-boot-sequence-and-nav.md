# Boot Sequence + Nav Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `boot-sequence.tsx` and `nav.tsx` in line with the 2026-07-24 visual-direction reset: boot sequence plays every visit with a credits-style upward scroll and a glitch/dissolve outro instead of a one-time linear reveal; nav drops its bracket/terminal notation in favor of a minimal header + fullscreen staggered-entrance overlay menu.

**Architecture:** Both are existing client components, rebuilt in place (no new files besides tests). Boot sequence uses CSS keyframes (flex-column-reverse-growth for the scroll effect, a multi-stage clip-path/filter keyframe for the glitch outro) instead of JS-driven transforms, so it stays cheap and respects the project's existing global `prefers-reduced-motion` override. Nav uses GSAP (already a dependency, same pattern as `hero.tsx`) for the overlay's staggered link entrance.

**Tech Stack:** React 19 / Next.js 16 client components, Tailwind v4 (existing tokens in `globals.css`), GSAP + `@gsap/react`, vitest + React Testing Library for behavioral tests.

## Global Constraints

- Color tokens, `--radius: 0` (no rounded corners), and Geist Sans/Mono are already correct in `src/app/globals.css` — do not modify the `:root` block.
- Terminal/bracket notation (`[ 01 / Work ]`) is confined to the boot sequence only, per Oliver's explicit correction ("I want it to be clean and professional... comparable to the best websites in the world"). Nav must not use it.
- All new CSS animation must be covered by the existing global `@media (prefers-reduced-motion: reduce)` rule in `globals.css` (animation-duration forced to 0.01ms) — verify, don't assume.
- TDD: write the failing test first for every behavioral (non-purely-visual) piece of logic. Visual/animation polish is verified via the preview tools, not vitest.
- Nothing gets committed or pushed without Oliver's explicit, in-the-moment approval.

---

### Task 1: Boot Sequence rebuild

**Files:**
- Modify: `src/components/boot-sequence.tsx`
- Modify: `src/app/globals.css` (add `boot-line-in` and `boot-outro` keyframes)
- Test: `src/components/boot-sequence.test.tsx`

**Interfaces:**
- Produces: `BootSequence` (named export, no props) — mounted once in `src/app/layout.tsx`, already wired, no change needed there.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/boot-sequence.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { BootSequence } from "./boot-sequence"

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe("BootSequence", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("reveals lines progressively, not all at once", async () => {
    render(<BootSequence />)
    expect(screen.queryByText("ACCESS GRANTED")).not.toBeInTheDocument()

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByText("ACCESS GRANTED")).toBeInTheDocument()
  })

  it("stops revealing further lines once skipped", async () => {
    render(<BootSequence />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    const firstLine = screen.getByText("$ ssh oliver@oliverstraus.com")
    expect(screen.queryByText("Authenticating...")).not.toBeInTheDocument()

    const overlay = firstLine.closest("[aria-hidden]")!
    fireEvent.click(overlay)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.queryByText("Authenticating...")).not.toBeInTheDocument()
  })

  it("unmounts entirely once the outro finishes", async () => {
    const { container } = render(<BootSequence />)
    fireEvent.click(container.querySelector("[aria-hidden]")!)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(container.querySelector("[aria-hidden]")).not.toBeInTheDocument()
  })

  it("skips straight through for prefers-reduced-motion users", async () => {
    mockMatchMedia(true)
    const { container } = render(<BootSequence />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- boot-sequence`
Expected: FAIL — current component has no `prefersReducedMotion` handling, uses a `localStorage` gate the tests don't mock, and never removes itself from the DOM (`visible` stays true).

- [ ] **Step 3: Rewrite the component**

```tsx
// src/components/boot-sequence.tsx
"use client";

import { useEffect, useRef, useState } from "react";

const LINES = [
  "$ ssh oliver@oliverstraus.com",
  "Authenticating...",
  "$ sudo apt update && sudo apt install -y identity-server",
  "Reading package lists... Done",
  "Setting up identity-server (14.2.0-cfo) ...",
  "$ systemctl start dossier.service",
  "[ OK ] Started dossier.service - Personal Record Daemon",
  "$ curl -s https://api.oliverstraus.com/whoami | jq",
  '{ "name": "Oliver Straus", "clearance": "founder", "status": "active" }',
  "ACCESS GRANTED",
];

const FIRST_LINE_DELAY_MS = 300;
const LINE_DELAY_MS = 180;
const HOLD_BEFORE_OUTRO_MS = 450;
const OUTRO_DURATION_MS = 650;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function BootSequence() {
  const [shown, setShown] = useState<string[]>([]);
  const [stage, setStage] = useState<"running" | "outro" | "done">("running");
  const finishedRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      finish();
      return;
    }

    (async () => {
      for (let i = 0; i < LINES.length; i++) {
        await new Promise((r) =>
          setTimeout(r, i === 0 ? FIRST_LINE_DELAY_MS : LINE_DELAY_MS),
        );
        if (finishedRef.current) return;
        setShown((prev) => [...prev, LINES[i]!]);
      }
      await new Promise((r) => setTimeout(r, HOLD_BEFORE_OUTRO_MS));
      if (!finishedRef.current) finish();
    })();

    return () => {
      finishedRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setStage("outro");
    setTimeout(() => setStage("done"), OUTRO_DURATION_MS);
  }

  if (stage === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden bg-background px-6 pb-[18vh] font-mono text-sm text-foreground sm:px-16 sm:text-base ${
        stage === "outro" ? "animate-boot-outro pointer-events-none" : ""
      }`}
      onClick={finish}
      aria-hidden={stage === "outro"}
    >
      <div className="mx-auto w-full max-w-2xl">
        {shown.map((line, i) => (
          <p
            key={i}
            className={`animate-boot-line ${
              line.startsWith("$")
                ? "text-accent-blue"
                : line.includes("GRANTED") || line.includes("OK")
                  ? "text-accent-blue-dim"
                  : "text-muted-foreground"
            }`}
          >
            {line}
          </p>
        ))}
        {stage === "running" && (
          <span className="inline-block h-4 w-2 animate-pulse bg-accent-blue align-middle" />
        )}
      </div>
      {stage === "running" && (
        <button
          type="button"
          onClick={finish}
          className="absolute bottom-8 right-8 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-accent-blue"
        >
          Skip &rarr;
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add the keyframes**

Append to `src/app/globals.css` (after the existing `scan-sweep` keyframe block):

```css
@keyframes boot-line-in {
  from {
    opacity: 0;
    transform: translateY(0.6em);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-boot-line {
  animation: boot-line-in 0.25s ease-out both;
}

@keyframes boot-outro {
  0% {
    opacity: 1;
    filter: none;
    clip-path: inset(0 0 0 0);
    transform: translate(0, 0);
  }
  12% {
    clip-path: inset(0 0 40% 0);
    transform: translate(-6px, 0);
  }
  24% {
    clip-path: inset(30% 0 0 0);
    transform: translate(5px, 0);
    filter: contrast(1.4) saturate(0);
  }
  36% {
    clip-path: inset(0 0 55% 0);
    transform: translate(-3px, 0);
  }
  48% {
    clip-path: inset(20% 0 0 0);
    transform: translate(4px, -2px);
    filter: contrast(1.2) saturate(0.3);
  }
  100% {
    opacity: 0;
    transform: translateY(-8%) scale(1.02);
    filter: blur(6px);
    clip-path: inset(0 0 100% 0);
  }
}

.animate-boot-outro {
  animation: boot-outro 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- boot-sequence`
Expected: PASS, 4/4

- [ ] **Step 6: Visual verification (preview tools, not vitest)**

Start the dev server, reload with cache disabled if needed, and confirm: lines scroll upward as new ones append (not a static stacked block), the skip button/click-anywhere works, and the outro reads as a glitch/dissolve rather than a plain fade. Screenshot before/after for the record.

- [ ] **Step 7: Commit — DO NOT RUN. Ask Oliver first per standing instruction.**

---

### Task 2: Nav rebuild

**Files:**
- Modify: `src/components/nav.tsx`
- Test: `src/components/nav.test.tsx`

**Interfaces:**
- Produces: `Nav` (named export, no props) — mounted in `src/app/page.tsx`, already wired, no change needed there.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/nav.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Nav } from "./nav"

describe("Nav", () => {
  it("renders closed by default", () => {
    render(<Nav />)
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("opens the overlay and lists all 4 section links", () => {
    render(<Nav />)
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }))

    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    for (const label of ["Work", "About", "Press", "Contact"]) {
      expect(
        screen.getByRole("link", { name: new RegExp(label) }),
      ).toBeInTheDocument()
    }
  })

  it("closes when a link is clicked", () => {
    render(<Nav />)
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }))
    fireEvent.click(screen.getByRole("link", { name: /Work/ }))

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("closes on Escape", () => {
    render(<Nav />)
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }))
    fireEvent.keyDown(window, { key: "Escape" })

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- nav`
Expected: FAIL — current component has no fullscreen overlay (mobile-only slide panel), no `Close menu` label, no Escape handling, and no bracket-free full link set at desktop sizes.

- [ ] **Step 3: Rewrite the component**

```tsx
// src/components/nav.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const LINKS = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#press", label: "Press" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useGSAP(
    () => {
      const links = linkRefs.current.filter(
        (el): el is HTMLAnchorElement => el !== null,
      );
      if (open) {
        gsap.to(overlayRef.current, {
          autoAlpha: 1,
          duration: 0.3,
          ease: "power2.out",
        });
        gsap.fromTo(
          links,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.07,
            delay: 0.1,
          },
        );
      } else {
        gsap.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.25,
          ease: "power2.in",
        });
      }
    },
    { dependencies: [open], scope: overlayRef },
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5" onClick={close}>
            <Image
              src="/assets/logo.svg"
              alt=""
              width={28}
              height={28}
              className="rounded-full"
            />
            <span className="font-mono text-sm font-medium tracking-tight">
              Oliver Straus
              <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] animate-pulse bg-accent-blue align-middle" />
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className="hidden rounded-full border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:border-accent-blue hover:text-accent-blue sm:inline-block"
            >
              Get in touch
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="relative z-[70] flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-full border border-border"
            >
              <span
                className={`h-px w-4 bg-foreground transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
              />
              <span
                className={`h-px w-4 bg-foreground transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={overlayRef}
        className="invisible fixed inset-0 z-[60] flex flex-col justify-center bg-background px-6 opacity-0"
        aria-hidden={!open}
      >
        <nav className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          {LINKS.map((link, i) => (
            <a
              key={link.href}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              href={link.href}
              onClick={close}
              className="group flex items-baseline gap-4 border-b border-border py-4 font-mono text-5xl font-black tracking-tight text-foreground transition-colors hover:text-accent-blue sm:text-7xl"
            >
              <span className="text-lg text-accent-blue-dim/60 sm:text-2xl">
                0{i + 1}
              </span>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- nav`
Expected: PASS, 4/4

- [ ] **Step 5: Visual verification (preview tools, not vitest)**

Confirm the overlay opens fullscreen with staggered large-type link entrance, no bracket notation anywhere, closes on link click / Escape / toggle, and works at both mobile and desktop viewport widths. Screenshot for the record.

- [ ] **Step 6: Commit — DO NOT RUN. Ask Oliver first per standing instruction.**

---

## Self-Review

**Spec coverage:** Every-visit playback (removed localStorage gate) ✓, upward-scroll-like-credits (flex-end + overflow-hidden growth) ✓, shatter/glitch outro flowing into the revealed site (clip-path/filter keyframe, unmounts on completion) ✓, always skippable (click-anywhere + button, both immediate) ✓. Nav: fullscreen overlay ✓, staggered large-typography entrance (GSAP stagger, text-5xl/7xl) ✓, no bracket/terminal styling ✓, minimal header retained ✓.

**Placeholder scan:** none — every step has complete, real code.

**Type consistency:** `BootSequence`/`Nav` both remain zero-prop named exports matching their existing call sites in `layout.tsx`/`page.tsx` — no signature changes, so no downstream edits needed.
