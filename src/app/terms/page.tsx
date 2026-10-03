import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection } from "@/components/legal-section";

const DESCRIPTION =
  "What you're agreeing to by using this site or downloading something from it -- short, no boilerplate.";

export const metadata: Metadata = {
  title: "Terms",
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms | Oliver Straus",
    description: DESCRIPTION,
    url: "https://oliverstraus.com/terms",
    siteName: "Oliver Straus",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms | Oliver Straus",
    description: DESCRIPTION,
  },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <Link
        href="/"
        className="inline-flex items-center py-1.5 -my-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
      >
        &larr; Back
      </Link>

      <h1 className="mt-6 text-3xl font-black tracking-tight">Terms</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated October 2026. Covers using this site and downloading anything from it.
      </p>

      <LegalSection title="Using this site">
        <p>
          This is Oliver Straus&apos;s personal site. Browsing it, reading it, and reaching
          out through the contact form is free to do and comes with no obligations beyond the
          ordinary: don&apos;t attack it, don&apos;t scrape it to republish as your own,
          don&apos;t abuse the contact form. See{" "}
          <Link href="/privacy" className="text-accent-blue hover:text-accent-blue-dim">
            Privacy
          </Link>{" "}
          for what&apos;s actually collected while you do.
        </p>
      </LegalSection>

      <LegalSection title="Downloading a project">
        <p>
          Some projects offered for download here ship under their own open-source
          license — check the download screen, which links straight to it when one
          applies. That license, not this page, governs what you can do with the code.
          Where no license is specified, you&apos;re free to use the software for your own
          personal use; no additional rights are granted beyond that.
        </p>
        <p>
          The software is provided as-is, with no warranty of any kind, express or implied.
          Oliver isn&apos;t liable for anything that happens from running it on your own
          machine. This isn&apos;t unusual for open-source software — it&apos;s the same
          disclaimer the MIT license itself already carries.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this page stops matching how this site or its downloads actually work, it gets
          fixed — same standard as the Privacy page.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms:{" "}
          <a
            href="mailto:oliverstraus@proton.me"
            className="text-accent-blue hover:text-accent-blue-dim"
          >
            oliverstraus@proton.me
          </a>
          .
        </p>
      </LegalSection>
    </main>
  );
}
