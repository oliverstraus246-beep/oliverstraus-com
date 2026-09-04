export interface ResumePreset {
  id: string;
  name: string;
  description: string;
  swatch: string;
  headingFont: "serif" | "mono" | "sans";
}

// Distinct visual identities, not just recolors of the same page -- each
// pairs a color treatment with a heading typeface so the four read as
// genuinely different documents (paper, code, drafting table, plain text)
// rather than a hue picker. Colors live as CSS variables under
// [data-resume-preset="id"] in globals.css.
export const RESUME_PRESETS: readonly ResumePreset[] = [
  {
    id: "ledger",
    name: "Ledger",
    description: "Warm paper tone, serif headers, built for finance and admissions readers.",
    swatch: "#f0ebe1",
    headingFont: "serif",
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Dark and monospace, matching the rest of the site's security aesthetic.",
    swatch: "#0c0f12",
    headingFont: "mono",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    description: "Cool, technical, monospace labels, built for engineering reviewers.",
    swatch: "#e7edf7",
    headingFont: "mono",
  },
  {
    id: "brief",
    name: "Brief",
    description: "Plain black and white, zero color: the safest ATS-conservative option.",
    swatch: "#ffffff",
    headingFont: "sans",
  },
] as const;

export type ResumePresetId = (typeof RESUME_PRESETS)[number]["id"];

export const DEFAULT_RESUME_PRESET: ResumePresetId = "ledger";

export function getResumePreset(id: string): ResumePreset {
  return RESUME_PRESETS.find((p) => p.id === id) ?? RESUME_PRESETS[0]!;
}
