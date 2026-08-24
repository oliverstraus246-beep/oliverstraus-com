"use client";

import { RESUME_PRESETS } from "@/lib/resume-presets";
import { useResumePreset } from "@/lib/use-resume-preset";

export function ResumePresetPicker() {
  const { preset, setPreset } = useResumePreset();

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Résumé style">
      {RESUME_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPreset(p.id)}
          aria-pressed={preset === p.id}
          title={`${p.name} — ${p.description}`}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
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
