import Link from "next/link";

const socials = [
  { label: "X", href: "https://x.com/OLIVER_STRAUS1" },
  { label: "Instagram", href: "https://instagram.com/oliver__straus" },
  { label: "LinkedIn", href: "https://linkedin.com/in/oliver-straus-06804240b" },
  { label: "GitHub", href: "https://github.com/oliverstraus246" },
  { label: "IMDb", href: "https://imdb.com/name/nm8461530" },
];

export default function Footer() {
  return (
    <footer
      className="py-10 px-6 md:px-12"
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <span
          className="text-text-secondary"
          style={{ fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.06em" }}
        >
          Oliver Straus &middot; Denver, CO
        </span>
        <nav className="flex items-center gap-6 flex-wrap">
          {socials.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              style={{ fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.08em" }}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
