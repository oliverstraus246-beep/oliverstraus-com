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

const FIRST_LINE_DELAY_MS = 400;
const LINE_DELAY_MS = 320;
const HOLD_BEFORE_OUTRO_MS = 700;
const OUTRO_DURATION_MS = 500;

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

    // This overlay is position:fixed, full-screen, and blocks the entire
    // site until it releases -- so it can never be allowed to get stuck
    // open, no matter the cause. Belt-and-suspenders against the async
    // loop below silently failing to complete (a thrown error, or a
    // device/browser throttling setTimeout in a background or
    // low-power-mode tab far enough to feel "frozen"): an unconditional
    // watchdog that force-releases it regardless of the loop's state.
    // Expected duration is ~4.5s; 12s gives real headroom for a slow or
    // throttled device without ever being mistakable for "stuck forever."
    const watchdog = setTimeout(finish, 12000);

    (async () => {
      try {
        for (let i = 0; i < LINES.length; i++) {
          await new Promise((r) =>
            setTimeout(r, i === 0 ? FIRST_LINE_DELAY_MS : LINE_DELAY_MS),
          );
          if (finishedRef.current) return;
          setShown((prev) => [...prev, LINES[i]!]);
        }
        await new Promise((r) => setTimeout(r, HOLD_BEFORE_OUTRO_MS));
        if (!finishedRef.current) finish();
      } catch {
        finish();
      }
    })();

    return () => {
      finishedRef.current = true;
      clearTimeout(watchdog);
    };
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
      id="boot-sequence-overlay"
      className={`no-print fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden bg-background px-6 pb-[18vh] font-mono text-sm text-foreground sm:px-16 sm:text-base ${
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
                ? "text-foreground"
                : line.includes("GRANTED") || line.includes("OK")
                  ? "text-accent-blue-dim"
                  : "text-muted-foreground"
            }`}
          >
            {line}
          </p>
        ))}
        {stage === "running" && (
          <span className="inline-block h-4 w-2 animate-pulse bg-foreground align-middle" />
        )}
      </div>
      {stage === "running" && (
        <button
          type="button"
          onClick={finish}
          // py-1.5 grows the tap target to ~28px (WCAG 2.2 AA 24px minimum);
          // the button is absolute-positioned so the extra height extends it
          // upward from its bottom-8 anchor, no flow impact.
          className="absolute bottom-8 right-8 py-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-accent-blue"
        >
          Skip &rarr;
        </button>
      )}
    </div>
  );
}
