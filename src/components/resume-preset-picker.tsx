"use client";

import { RESUME_PRESETS } from "@/lib/resume-presets";
import { useResumePreset } from "@/lib/use-resume-preset";

export function ResumePresetPicker({ className = "" }: { className?: string }) {
  const { preset, setPreset } = useResumePreset();

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      role="group"
      aria-label="Résumé style"
    >
      {RESUME_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPreset(p.id)}
          aria-pressed={preset === p.id}
          title={`${p.name} — ${p.description}`}
          // shrink-0 so the buttons keep their width inside a horizontally
          // scrollable row (the mobile modal header) instead of compressing.
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
            preset === p.id
              ? "border-accent-blue text-accent-blue"
              : "border-border text-muted-foreground hover:border-accent-blue/50 hover:text-foreground"
          }`}
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: p.swatch }}
          />
          {p.name}
        </button>
      ))}
    </div>
  );
}
