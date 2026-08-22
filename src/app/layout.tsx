import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { BootSequence } from "@/components/boot-sequence";
import { Cursor } from "@/components/cursor";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { ResumeModal } from "@/components/resume-modal";
import { ScrollReset } from "@/components/scroll-reset";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Oliver Straus. Appointed CFO at 14. Security-focused software engineer and builder. Denver, Colorado.";

export const metadata: Metadata = {
  metadataBase: new URL("https://oliverstraus.com"),
  title: {
    default: "Oliver Straus",
    template: "%s | Oliver Straus",
  },
  description: DESCRIPTION,
  openGraph: {
    title: "Oliver Straus",
    description: DESCRIPTION,
    url: "https://oliverstraus.com",
    siteName: "Oliver Straus",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oliver Straus",
    description: DESCRIPTION,
  },
};

const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Oliver Straus",
  url: "https://oliverstraus.com",
  email: "mailto:oliverstraus246@gmail.com",
  jobTitle: "Software Engineer",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Denver",
    addressRegion: "CO",
    addressCountry: "US",
  },
  sameAs: [
    "https://linkedin.com/in/oliver-straus-06804240b",
    "https://github.com/oliverstraus246-beep",
    "https://x.com/OLIVER_STRAUS1",
    "https://instagram.com/oliver__straus",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Static JSON-LD, not user input -- safe as a plain child (React
            escapes it as text), no dangerouslySetInnerHTML needed. Ships
            without the proxy's per-request CSP nonce: adding one would
            force this whole site out of static generation, which isn't
            worth it for a data blob crawlers read from raw HTML source
            rather than executing. */}
        <script type="application/ld+json">{JSON.stringify(PERSON_JSON_LD)}</script>
        <ScrollReset />
        <BootSequence />
        <Cursor />
        <div className="grain-overlay" aria-hidden="true" />
        <Nav />
        <div className="flex-1">{children}</div>
        <Footer />
        <ResumeModal />
      </body>
    </html>
  );
}
