import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "@/styles/globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import CustomCursor from "@/components/CustomCursor";
import GrainOverlay from "@/components/GrainOverlay";
import SmoothScroll from "@/components/SmoothScroll";
import { personSchema } from "@/lib/schema";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oliver Straus — Founder & Operator",
  description: "Oliver Straus is a 16-year-old founder, CEO, and builder based in Denver, CO.",
  openGraph: {
    title: "Oliver Straus — Founder & Operator",
    description: "Oliver Straus is a 16-year-old founder, CEO, and builder based in Denver, CO.",
    url: "https://oliverstraus.com",
    images: [{ url: "https://oliverstraus.com/oliver.jpg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oliver Straus — Founder & Operator",
    description: "Oliver Straus is a 16-year-old founder, CEO, and builder based in Denver, CO.",
    images: ["https://oliverstraus.com/oliver.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${GeistSans.variable}`}>
      <body style={{ fontFamily: "var(--font-body)" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        <SmoothScroll />
        <CustomCursor />
        <GrainOverlay />
        <ScrollProgress />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
