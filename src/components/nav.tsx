"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CommandPalette } from "@/components/command-palette";
import { openResume } from "@/components/resume-modal";

const LINKS = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "/resume", label: "Resume", isResume: true },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useGSAP(
    () => {
      const links = linkRefs.current.filter(
        (el): el is HTMLAnchorElement => el !== null,
      );
      if (open) {
        gsap.to(overlayRef.current, {
          autoAlpha: 1,
          duration: 0.3,
          ease: "power2.out",
        });
        gsap.fromTo(
          links,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.07,
            delay: 0.1,
          },
        );
      } else {
        gsap.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.25,
          ease: "power2.in",
        });
      }
    },
    { dependencies: [open], scope: overlayRef },
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5" onClick={close}>
            <Image
              src="/assets/logo.png"
              alt=""
              width={28}
              height={28}
              className="rounded-full"
            />
            <span className="font-mono text-sm font-medium tracking-tight">
              Oliver Straus
              <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] animate-pulse bg-accent-blue align-middle" />
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <CommandPalette />

            <a
              href="#contact"
              className="hidden h-10 items-center rounded-full border border-border px-4 font-mono text-xs uppercase tracking-widest transition-colors duration-150 hover:border-accent-blue hover:text-accent-blue sm:inline-flex"
            >
              Get in touch
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="relative z-[70] flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full border border-border transition-colors duration-150 hover:border-accent-blue"
            >
              <span
                className={`h-px w-4 bg-foreground transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
              />
              <span
                className={`h-px w-4 bg-foreground transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={overlayRef}
        className={`fixed inset-0 z-[60] flex flex-col justify-center bg-background px-6 opacity-0 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <nav className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          {LINKS.map((link, i) => (
            <a
              key={link.href}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              href={link.href}
              onClick={(e) => {
                if (link.isResume) {
                  e.preventDefault();
                  openResume();
                }
                close();
              }}
              className="group flex items-baseline gap-4 border-b border-border py-4 font-mono text-5xl font-black tracking-tight text-foreground transition-colors hover:text-accent-blue sm:text-7xl"
            >
              <span className="text-lg text-accent-blue-dim/60 sm:text-2xl">
                0{i + 1}
              </span>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
