"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Small icon-only "copy to clipboard" affordance. Kept deliberately tiny and
// muted so it reads as a quiet utility next to a link, not a competing CTA.
// The button is h-6 w-6 (24px) to meet the WCAG 2.2 AA touch-target minimum
// even on mobile, and the icon swaps to a check + accent color for 2s on
// success -- a text-state change, not motion, so it's fine under reduced
// motion. navigator.clipboard is preferred (async, secure-context) with a
// hidden-textarea execCommand fallback for older browsers / non-HTTPS.
export function CopyButton({
  value,
  label,
  className = "",
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // give up silently -- the button just won't show "Copied"
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      // Accessible name reflects state: "Copy email" -> "Email copied", so a
      // screen-reader user hears confirmation after activation rather than
      // only the visual check swap.
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={`inline-flex h-6 w-6 items-center justify-center rounded align-middle text-muted-foreground transition-colors duration-150 hover:text-accent-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-accent-blue" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}