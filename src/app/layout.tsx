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

// Runs before hydration (strategy="beforeInteractive") so the chosen
// theme/accent apply before first paint -- no flash of the default dark
// palette while React boots. Static string, no user input, so this is safe
// as an inline script despite the lack of a per-request CSP nonce (see the
// JSON-LD note below for why this site skips nonces generally).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("theme");
    var accent = localStorage.getItem("accent");
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.accent =
      accent === "amber" || accent === "violet" || accent === "emerald" ? accent : "blue";
  } catch (e) {}
})();
`;

// A React-independent failsafe for the boot overlay (#boot-sequence-overlay
// in boot-sequence.tsx), same inline-script technique as THEME_INIT_SCRIPT
// above. BootSequence's own watchdog lives inside a useEffect, so it never
// runs at all if React hydration itself fails on a given device -- reported
// live as the boot overlay staying fully stuck (blinking cursor, no lines,
// skip button visually present but unresponsive) on a phone, which is the
// exact signature of hydration never completing: only pure-CSS animation
// (the cursor blink) kept running, and no click handler ever attached. This
// runs the instant the browser parses <head>, entirely independent of the
// React bundle loading, executing, or hydrating successfully -- so it can
// unstick the overlay even when nothing else on the page works. Event
// delegation on document (not a direct listener on the element) so it
// works regardless of exactly when the overlay appears in the DOM.
const BOOT_FAILSAFE_SCRIPT = `
(function () {
  var released = false;
  function release() {
    if (released) return;
    released = true;
    var el = document.getElementById("boot-sequence-overlay");
    if (el) { el.style.display = "none"; }
  }
  document.addEventListener("click", function (e) {
    if (e.target && e.target.closest && e.target.closest("#boot-sequence-overlay")) {
      release();
    }
  });
  setTimeout(release, 6000);
})();
`;

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
    "https://gitlab.com/oliverstraus",
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
      suppressHydrationWarning
      className={`${plexSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Plain inline script (not next/script's <Script>) so it runs
            synchronously during HTML parsing, before first paint -- and so
            it never picks up next/script's automatic CSP-nonce handling,
            which was rendering a stray nonce="" server-side vs undefined
            client-side. suppressHydrationWarning on <html> above covers the
            data-theme/data-accent attributes this script sets before React
            hydrates (see preventing-flash-before-hydration docs). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: BOOT_FAILSAFE_SCRIPT }} />
      </head>
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
