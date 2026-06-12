import Hero from "@/components/Hero";
import RolesStrip from "@/components/RolesStrip";
import StatsStrip from "@/components/StatsStrip";
import KineticTitle from "@/components/KineticTitle";
import FactSection from "@/components/FactSection";
import BuilderSection from "@/components/BuilderSection";
import Bio from "@/components/Bio";
import Statement from "@/components/Statement";
import { fineArt, imperial, philanthropy } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <Hero />
      <RolesStrip />
      <StatsStrip />

      <KineticTitle
        word="FOUNDER"
        rest="no capital. no permission."
        accentColor="#c8b4f8"
      />
      <FactSection {...fineArt} />
      <FactSection {...imperial} />

      <KineticTitle
        word="$250K"
        rest="given, not kept."
        accentColor="#d4a843"
      />
      <FactSection {...philanthropy} />

      <KineticTitle
        word="BUILDER"
        rest="of software that runs itself."
        accentColor="#5b9cf6"
      />
      <BuilderSection />

      <Bio />
      <Statement />
    </>
  );
}

