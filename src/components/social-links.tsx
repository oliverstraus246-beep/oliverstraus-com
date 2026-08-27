export const PLATFORMS = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/oliver-straus-06804240b",
  },
  { label: "GitLab", href: "https://gitlab.com/oliverstraus" },
  { label: "X", href: "https://x.com/OLIVER_STRAUS1" },
  { label: "Instagram", href: "https://instagram.com/oliver__straus" },
] as const;

export function SocialLinks() {
  // gap-3 (12px), not gap-2 -- so the py-1.5 -my-1.5 hit-box enlargement on
  // each link (6px expansion per side) touches but doesn't overlap the
  // neighbor. Bare text-sm links were ~20px, below the WCAG 2.2 AA 24px
  // minimum; this grows the tap box to ~32px with the negative margin
  // cancelling the box growth so visual position is unchanged.
  return (
    <ul className="flex flex-col gap-3">
      {PLATFORMS.map((platform) => (
        <li key={platform.label}>
          <a
            href={platform.href}
            target="_blank"
            rel="noreferrer noopener"
            // min-w-6 (24px) so a one-glyph label like "X" still meets the
            // WCAG 2.2 AA touch-target minimum on width -- without it the X
            // link's hit box is only ~8px wide, effectively untappable on a
            // phone. py-1.5 -my-1.5 grows height to ~32px with negative
            // margin cancelling the box growth so visual position is
            // unchanged; gap-3 keeps the per-side expansion from a neighbor.
            className="inline-flex min-w-6 justify-center items-center py-1.5 -my-1.5 font-mono text-sm text-foreground/80 transition-colors hover:text-accent-blue"
          >
            {platform.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
