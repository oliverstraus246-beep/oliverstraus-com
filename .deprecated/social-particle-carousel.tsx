"use client";

// Replaces social-orbit.tsx entirely -- Oliver's actual spec was one
// platform shown at a time, a large 3D-spinning logo built from tiny dots,
// name below, arrows to navigate, dots scatter on push and reform. This is
// a fork of dot-grid.tsx's canvas physics (GSAP InertiaPlugin push +
// elastic return), not the discrete-orbiting-icons approach that got
// rejected. The "3D" spin is a pseudo-3D trick, not WebGL: each point's x
// coordinate rotates through a simulated depth axis (z = x*sin(angle)),
// then a perspective divide (focal / (focal + z)) shrinks/dims far points
// and enlarges/brightens near ones -- the same math behind classic
// "flat card spinning like a coin" effects, cheap on a 2D canvas and
// consistent with this project's existing GSAP/canvas conventions rather
// than introducing a new rendering engine for one component.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { PARTICLE_SHAPES } from "@/lib/particle-shapes";

gsap.registerPlugin(InertiaPlugin);

const PLATFORMS = [
  {
    key: "linkedin",
    label: "LinkedIn",
    href: "https://linkedin.com/in/oliver-straus-06804240b",
  },
  {
    key: "github",
    label: "GitHub",
    href: "https://github.com/oliverstraus246-beep",
  },
  { key: "x", label: "X", href: "https://x.com/OLIVER_STRAUS1" },
  {
    key: "instagram",
    label: "Instagram",
    href: "https://instagram.com/oliver__straus",
  },
] as const;

const DOT_COUNT = 260;
const FOCAL = 140;
const REVOLUTION_SECONDS = 7;
const PROXIMITY = 40;
const PUSH_RESISTANCE = 500;
const RETURN_DURATION = 1.1;
const RETURN_EASE = "elastic.out(1,0.65)";

interface Dot {
  baseX: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
  pushing: boolean;
}

function resample(
  points: readonly (readonly [number, number])[],
  count: number,
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const p = points[i % points.length]!;
    out.push([p[0], p[1]]);
  }
  return out;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function SocialParticleCarousel() {
  const [index, setIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const angleRef = useRef(0);
  const reducedRef = useRef(false);

  const shapesByKey = useMemo(() => {
    const map: Record<string, [number, number][]> = {};
    for (const platform of PLATFORMS) {
      map[platform.key] = resample(PARTICLE_SHAPES[platform.key] ?? [], DOT_COUNT);
    }
    return map;
  }, []);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
  }, []);

  useEffect(() => {
    const target = shapesByKey[PLATFORMS[index]!.key]!;
    if (dotsRef.current.length === 0) {
      dotsRef.current = target.map(([x, y]) => ({
        baseX: x,
        baseY: y,
        offsetX: 0,
        offsetY: 0,
        pushing: false,
      }));
      return;
    }

    dotsRef.current.forEach((dot, i) => {
      const [tx, ty] = target[i]!;
      gsap.killTweensOf(dot);
      if (reducedRef.current) {
        dot.baseX = tx;
        dot.baseY = ty;
        dot.offsetX = 0;
        dot.offsetY = 0;
        return;
      }
      const scatterAngle = Math.random() * Math.PI * 2;
      const scatterDist = 26 + Math.random() * 18;
      gsap.to(dot, {
        offsetX: Math.cos(scatterAngle) * scatterDist,
        offsetY: Math.sin(scatterAngle) * scatterDist,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          dot.baseX = tx;
          dot.baseY = ty;
          gsap.to(dot, {
            offsetX: 0,
            offsetY: 0,
            duration: RETURN_DURATION,
            ease: RETURN_EASE,
          });
        },
      });
    });
  }, [index, shapesByKey]);

  useEffect(() => {
    let rafId: number;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!reducedRef.current) {
        angleRef.current += ((Math.PI * 2) / REVOLUTION_SECONDS) * dt;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx && canvas.width > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const dpr = window.devicePixelRatio || 1;
        const cx = canvas.width / (2 * dpr);
        const cy = canvas.height / (2 * dpr);
        const unit = Math.min(cx, cy) / 65;
        const angle = angleRef.current;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const projected = dotsRef.current.map((dot) => {
          const x = dot.baseX + dot.offsetX;
          const y = dot.baseY + dot.offsetY;
          const rx = x * cos;
          const z = x * sin;
          const persp = FOCAL / (FOCAL + z);
          return {
            x: cx + rx * unit * persp,
            y: cy + y * unit * persp,
            r: Math.max(0.5, 1.5 * persp),
            alpha: Math.min(1, Math.max(0.2, persp - 0.15)),
            z,
          };
        });
        projected.sort((a, b) => a.z - b.z);

        for (const p of projected) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(242, 242, 240, ${p.alpha})`;
          ctx.fill();
        }
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.getContext("2d")?.scale(dpr, dpr);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onMove = (e: MouseEvent) => {
      if (reducedRef.current) return;
      const rect = wrap.getBoundingClientRect();
      const unit = Math.min(rect.width, rect.height) / 130;
      const px = (e.clientX - rect.left - rect.width / 2) / unit;
      const py = (e.clientY - rect.top - rect.height / 2) / unit;

      for (const dot of dotsRef.current) {
        const dx = dot.baseX + dot.offsetX - px;
        const dy = dot.baseY + dot.offsetY - py;
        const dist = Math.hypot(dx, dy);
        if (dist < PROXIMITY && !dot.pushing) {
          dot.pushing = true;
          gsap.killTweensOf(dot);
          const falloff = 1 - dist / PROXIMITY;
          gsap.to(dot, {
            inertia: {
              offsetX: dx * falloff * 1.3,
              offsetY: dy * falloff * 1.3,
              resistance: PUSH_RESISTANCE,
            },
            onComplete: () => {
              gsap.to(dot, {
                offsetX: 0,
                offsetY: 0,
                duration: RETURN_DURATION,
                ease: RETURN_EASE,
              });
              dot.pushing = false;
            },
          });
        }
      }
    };

    wrap.addEventListener("mousemove", onMove);
    return () => wrap.removeEventListener("mousemove", onMove);
  }, []);

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + PLATFORMS.length) % PLATFORMS.length);
  }, []);

  const platform = PLATFORMS[index]!;

  return (
    <div className="flex flex-col items-center">
      <div ref={wrapRef} className="relative h-40 w-40">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        />
      </div>
      <div className="mt-4 flex items-center gap-5">
        <button
          type="button"
          aria-label="Previous social link"
          onClick={() => go(-1)}
          className="text-muted-foreground transition-colors hover:text-accent-blue focus-visible:text-accent-blue focus-visible:outline-none"
        >
          &larr;
        </button>
        <a
          href={platform.href}
          target="_blank"
          rel="noreferrer noopener"
          className="font-mono text-xs uppercase tracking-widest text-foreground/80 transition-colors hover:text-accent-blue"
        >
          {platform.label}
        </a>
        <button
          type="button"
          aria-label="Next social link"
          onClick={() => go(1)}
          className="text-muted-foreground transition-colors hover:text-accent-blue focus-visible:text-accent-blue focus-visible:outline-none"
        >
          &rarr;
        </button>
      </div>
    </div>
  );
}
