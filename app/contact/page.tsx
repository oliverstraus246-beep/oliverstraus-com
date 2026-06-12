import type { Metadata } from "next";
import { contactLinks } from "@/lib/content";

export const metadata: Metadata = {
  title: "Oliver Straus — Contact",
  description: "Get in touch with Oliver Straus.",
};

export default function ContactPage() {
  return (
    <div
      className="min-h-screen pt-28 pb-24 px-6"
      style={{ background: "var(--base)" }}
    >
      <div className="max-w-xl mx-auto">
        <h1
          className="text-text-primary mb-16"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
            fontWeight: 400,
            lineHeight: 1.1,
          }}
        >
          Get in touch.
        </h1>

        <ul className="flex flex-col" style={{ gap: "1.25rem" }}>
          {contactLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target={link.href.startsWith("mailto") ? undefined : "_blank"}
                rel={link.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                className="text-text-primary hover:text-accent transition-colors duration-200"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "16px",
                  lineHeight: 1.8,
                  display: "inline-block",
                }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
