export const PLATFORMS = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/oliver-straus-06804240b",
  },
  { label: "X", href: "https://x.com/OLIVER_STRAUS1" },
  { label: "Instagram", href: "https://instagram.com/oliver__straus" },
] as const;

export function SocialLinks() {
  return (
    <ul className="flex flex-col gap-2">
      {PLATFORMS.map((platform) => (
        <li key={platform.label}>
          <a
            href={platform.href}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-sm text-foreground/80 transition-colors hover:text-accent-blue"
          >
            {platform.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
