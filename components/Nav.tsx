"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { navLinks } from "@/lib/content";

export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: scrolled ? "rgba(8,8,8,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "none",
          transition: "background 0.3s, backdrop-filter 0.3s, border-color 0.3s",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/" className="text-text-primary" style={{ fontFamily:"var(--font-display)", fontSize:"15px" }}>
            Oliver Straus
          </Link>
          <ul className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href} className="relative">
                <Link
                  href={link.href}
                  className="text-xs uppercase tracking-widest transition-colors duration-200 pb-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    letterSpacing: "0.12em",
                    color: pathname === link.href ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {link.label}
                </Link>
                {pathname === link.href && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-0 right-0"
                    style={{ height: "1px", background: "rgba(255,255,255,0.3)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </li>
            ))}
          </ul>
          <button className="md:hidden flex flex-col gap-1.5 p-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {[0,1,2].map((j) => (
              <span key={j} className="block w-5 h-px bg-text-secondary transition-all duration-200" style={{
                transform: j===0 && menuOpen ? "rotate(45deg) translate(3px,3px)" : j===2 && menuOpen ? "rotate(-45deg) translate(3px,-3px)" : "none",
                opacity: j===1 && menuOpen ? 0 : 1,
              }}/>
            ))}
          </button>
        </div>
      </motion.nav>

      {/* Mobile overlay */}
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center md:hidden transition-all duration-300" style={{ background:"rgba(8,8,8,0.97)", opacity:menuOpen?1:0, pointerEvents:menuOpen?"auto":"none" }}>
        <ul className="flex flex-col items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-2xl tracking-widest uppercase" style={{ fontFamily:"var(--font-body)", color: pathname===link.href ? "var(--text-primary)" : "var(--text-secondary)", letterSpacing:"0.15em" }}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
