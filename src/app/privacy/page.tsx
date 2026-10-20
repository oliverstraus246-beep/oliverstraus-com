import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection } from "@/components/legal-section";

const DESCRIPTION =
  "What this site actually collects, why, and who (if anyone) it's shared with -- no boilerplate, matches the real database schema.";

export const metadata: Metadata = {
  title: "Privacy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy | Oliver Straus",
    description: DESCRIPTION,
    url: "https://oliverstraus.com/privacy",
    siteName: "Oliver Straus",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy | Oliver Straus",
    description: DESCRIPTION,
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <Link
        href="/"
        className="inline-flex items-center py-1.5 -my-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent-blue"
      >
        &larr; Back
      </Link>

      <h1 className="mt-6 text-3xl font-black tracking-tight">Privacy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated October 2026. This describes exactly what this site&apos;s own code collects --
        not a generic template, and not aspirational. If something below stops being true, this
        page is wrong and should be fixed, not the other way around.
      </p>

      <LegalSection title="The short version">
        <p>
          This site runs its own self-hosted analytics and security logging instead of Google
          Analytics or any third-party tracker -- no ad networks, no marketing pixels, no cookie
          consent banner, because there&apos;s nothing here that needs one. Everything described
          below lives in a Supabase database Oliver controls directly. It exists to answer &quot;who&apos;s
          visiting my site&quot; and &quot;is anyone attacking it,&quot; not to build a profile to sell anything.
        </p>
      </LegalSection>

      <LegalSection title="What's collected when you browse">
        <p>Every page view records: the path, referring page, browser/OS (from your User-Agent),
        screen width, browser language, how long you stayed, how far down the page you scrolled,
        your browser&apos;s timezone, and your IP address -- both a raw copy and a salted one-way
        hash. Country/region/city are derived from your IP by Vercel&apos;s edge network, not looked
        up separately. If you arrived via a link with <code>utm_source</code>/<code>utm_medium</code>/
        <code>utm_campaign</code> in the URL, those are recorded too, so Oliver can tell which
        shared link or channel sent you. It also records a random identifier generated in your
        browser (see &quot;Persistent visitor identifier&quot; below), if one is available.</p>
        <p>
          The raw IP is a deliberate exception to an otherwise hash-only design: every other table
          on this site stores only the salted hash, but page views keep the real address too so
          Oliver can see it directly in his own admin dashboard. If the database were ever
          breached, this is the one place real visitor IPs would be exposed -- accepted knowingly,
          not accidentally.
        </p>
      </LegalSection>

      <LegalSection title="Persistent visitor identifier">
        <p>
          The first time you load a page, this site generates a random ID and stores it in your
          browser&apos;s local storage (not a cookie). Every page view afterward includes it. It
          exists for one reason: if your IP address changes between visits (home internet
          reconnecting, switching from wifi to cellular, a VPN toggling on or off), this ID lets
          Oliver&apos;s admin dashboard recognize you as the same returning visitor instead of
          creating a second, disconnected profile. It contains nothing about you beyond a random
          value, is never sent anywhere except this site&apos;s own tracking endpoint, and clearing
          your browser&apos;s site data for oliverstraus.com removes it -- you&apos;ll just look like a
          new visitor on your next visit.
        </p>
      </LegalSection>

      <LegalSection title="If you use the contact form">
        <p>Name, email, and whatever you write get stored, along with your IP hash and User-Agent,
        so Oliver can reply to you and so spam/abuse can be traced back to a source.</p>
      </LegalSection>

      <LegalSection title="If you're a bot, scanner, or attacker">
        <p>
          This site runs decoy paths and pattern-matches for common attack payloads (SQL
          injection, XSS, and similar). Tripping one logs the path, IP, User-Agent, and which
          attack category matched, and blocks the source from the rest of the site. If that
          applies to you, you already know, and you&apos;ve read the joke response.
        </p>
      </LegalSection>

      <LegalSection title="The one thing sent to a third party">
        <p>
          For a visitor flagged as suspicious, this site looks up their IP&apos;s ISP, organization,
          and whether it&apos;s a known VPN/proxy or hosting provider, via{" "}
          <a
            href="https://ip-api.com"
            target="_blank"
            rel="noreferrer"
            className="text-accent-blue hover:text-accent-blue-dim"
          >
            ip-api.com
          </a>{" "}
          (a free, third-party IP geolocation service). That lookup is cached for 30 days. This is
          the only place on this site where a visitor&apos;s IP address is sent anywhere outside
          Supabase (the database) and Vercel (the host) -- and it only happens for flagged,
          suspicious traffic, not ordinary visitors.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Regular visitors get none. The only cookie this site sets is a signed session cookie for
          Oliver&apos;s own admin login, scoped to <code>/admin</code>, and it&apos;s never set unless someone
          successfully authenticates with a password and an authenticator code. The persistent
          visitor identifier above is local storage, not a cookie -- it&apos;s not sent to the browser
          automatically on every request the way a cookie is, and it&apos;s cleared differently (site
          data, not the cookie jar).
        </p>
      </LegalSection>

      <LegalSection title="What this data is used for">
        <p>
          Understanding real traffic to this site, replying to contact form messages, and
          detecting/blocking abuse. It is never sold, never shared with advertisers, and never
          used for anything beyond running this site.
        </p>
      </LegalSection>

      <LegalSection title="Retention and control">
        <p>
          Honeypot/attack logs older than 90 days can be purged from the admin dashboard. Page
          views and contact submissions are kept indefinitely for now (this is a personal
          portfolio site with modest traffic, not a service processing data at a scale where
          retention limits are load-bearing) but are never used to build profiles that leave this
          database.
        </p>
        <p>
          Want your data removed? Email{" "}
          <a href="mailto:oliverstraus@proton.me" className="text-accent-blue hover:text-accent-blue-dim">
            oliverstraus@proton.me
          </a>{" "}
          and it will be deleted.
        </p>
      </LegalSection>

      <LegalSection title="If you download a project">
        <p>
          Downloading a project from this site logs the platform you picked
          (Mac/Linux/Windows), the version served, your IP hash, and your User-Agent
          — the same salted-hash-only approach as everything else on this site except page
          views. It exists to see which platforms people actually use and to catch abuse of
          the download endpoint. Never sold, never shared.
        </p>
      </LegalSection>

      <LegalSection title="If you arrive via a shared résumé link">
        <p>
          Oliver sometimes shares a résumé link off-site (an email signature, a job
          application, LinkedIn) that routes through <code>oliverstraus.com/r/resume</code>{" "}
          before landing on the résumé itself. That one request logs a short source tag (which
          link you clicked), your IP hash, and your User-Agent, then immediately redirects you
          — it exists only so Oliver can see which outbound channel actually drives résumé
          opens. Opening the résumé directly on this site (the menu, the footer, or the
          standalone page) never touches this and is covered by &quot;What&apos;s collected when
          you browse&quot; instead.
        </p>
      </LegalSection>
    </main>
  );
}
