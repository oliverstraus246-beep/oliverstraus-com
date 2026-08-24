"use client";

import { CountUp } from "@/components/count-up";
import { useInView } from "@/lib/use-in-view";

interface Metric {
  value: string;
  label: string;
}

/**
 * A row of real numbers pulled from venture data, given the same visual
 * weight as a chart without implying false proportionality -- these are
 * heterogeneous facts (MB parsed, turns, tools, radios), not one shared
 * scale, so the "chart" is an animated draw-in rule per metric rather than
 * a bar-out-of-some-max, which would fake precision that isn't there.
 */
export function MetricRow({ metrics }: { metrics: readonly Metric[] }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);

  return (
    <div ref={ref} className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
      {metrics.map((metric, i) => (
        <div key={metric.label}>
          <p className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            <CountUp value={metric.value} />
          </p>
          <div
            aria-hidden="true"
            className="mt-3 h-px origin-left bg-accent-blue/40 transition-transform duration-700 ease-out"
            style={{
              transitionDelay: `${i * 90}ms`,
              transform: inView ? "scaleX(1)" : "scaleX(0)",
            }}
          />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {metric.label}
          </p>
        </div>
      ))}
    </div>
  );
}
