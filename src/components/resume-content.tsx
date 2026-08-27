"use client";

import { RESUME } from "@/lib/resume";
import { getResumePreset } from "@/lib/resume-presets";
import { useResumePreset } from "@/lib/use-resume-preset";

const HEADING_FONT_CLASS = {
  serif: "font-serif",
  mono: "font-mono",
  sans: "font-sans",
} as const;

/**
 * Deliberately NOT styled like the rest of the site by default -- a resume
 * that reads as a dark hacker-terminal page would work against itself in
 * front of a recruiter or admissions reader. Colors come from CSS variables
 * scoped under [data-resume-preset] (see globals.css + lib/resume-presets.ts)
 * so the four presets are real distinct documents, not a single hardcoded
 * light theme. Shared between the in-page modal and window.print() (see
 * resume-modal.tsx and the .resume-print-area rules in globals.css) --
 * print picks up whatever preset is currently selected automatically,
 * since it's the same DOM.
 */
export function ResumeContent() {
  const { preset: presetId } = useResumePreset();
  const preset = getResumePreset(presetId);
  const headingFont = HEADING_FONT_CLASS[preset.headingFont];

  return (
    <div
      data-resume-preset={preset.id}
      className="resume-print-area flex flex-col bg-[var(--resume-bg)] text-[var(--resume-text)] sm:flex-row"
    >
      <aside className="shrink-0 bg-[var(--resume-sidebar-bg)] px-8 py-10 sm:w-64 sm:px-6 sm:py-12">
        <h1
          className={`text-balance text-3xl font-medium leading-tight tracking-tight text-[var(--resume-text)] ${headingFont}`}
        >
          {RESUME.name}
        </h1>
        <p className="mt-1.5 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-[var(--resume-muted)]">
          {RESUME.title}
        </p>

        <div className="mt-6 space-y-0.5 border-t border-[var(--resume-border)] pt-6 text-xs text-[var(--resume-muted)]">
          <p>{RESUME.location}</p>
          <p className="tabular-nums">{RESUME.phone}</p>
          <p>{RESUME.email}</p>
          <p>{RESUME.site}</p>
        </div>

        <div className="mt-8 border-t border-[var(--resume-border)] pt-6">
          <h2
            className={`text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--resume-muted)] ${headingFont}`}
          >
            Skills
          </h2>
          <div className="mt-3 space-y-3">
            {RESUME.skills.map((skill) => (
              <div key={skill.category}>
                <p className="text-xs font-semibold text-[var(--resume-text)]">{skill.category}</p>
                <p className="text-pretty text-xs leading-relaxed text-[var(--resume-muted)]">
                  {skill.items}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--resume-border)] pt-6">
          <h2
            className={`text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--resume-muted)] ${headingFont}`}
          >
            Education
          </h2>
          <p className="mt-3 text-xs font-semibold text-[var(--resume-text)]">
            {RESUME.education.program}
          </p>
          <p className="text-pretty text-xs leading-relaxed text-[var(--resume-muted)]">
            {RESUME.education.detail}
          </p>
        </div>

        <div className="mt-8 border-t border-[var(--resume-border)] pt-6">
          <h2
            className={`text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--resume-muted)] ${headingFont}`}
          >
            Community
          </h2>
          <p className="mt-3 text-xs font-semibold text-[var(--resume-text)]">
            {RESUME.community.org} &middot; {RESUME.community.role}
          </p>
          <p className="text-pretty text-xs leading-relaxed text-[var(--resume-muted)]">
            {RESUME.community.detail}
          </p>
        </div>
      </aside>

      <div className="resume-main min-w-0 flex-1 px-8 py-10 sm:px-10 sm:py-12">
        <div className="grid grid-cols-3 gap-4 border-b border-[var(--resume-border)] pb-6">
          {RESUME.stats.map((stat) => (
            <div key={stat.label}>
              <p
                className={`text-2xl font-bold tabular-nums text-[var(--resume-text)] ${headingFont}`}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] uppercase leading-snug tracking-wide text-[var(--resume-muted)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <p className="text-pretty mt-6 text-sm leading-relaxed text-[var(--resume-text)]">
          {RESUME.summary}
        </p>

        <div className="mt-8">
          <h2
            className={`text-xs font-bold uppercase tracking-[0.15em] text-[var(--resume-muted)] ${headingFont}`}
          >
            Professional Experience
          </h2>
          <div className="relative mt-4 space-y-7 border-l border-[var(--resume-border)] pl-6">
            {RESUME.experience.map((job) => (
              <div key={job.role + job.org} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--resume-bg)] bg-[var(--resume-accent)]"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <p className="text-sm font-semibold text-[var(--resume-text)]">{job.role}</p>
                  <p className="shrink-0 text-xs tabular-nums text-[var(--resume-muted)]">
                    {job.dates}
                  </p>
                </div>
                <p className="text-xs text-[var(--resume-muted)]">
                  {job.org} &middot; {job.context}
                </p>
                <ul className="text-pretty mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-[var(--resume-text)]">
                  {job.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--resume-border)] pt-8">
          <h2
            className={`text-xs font-bold uppercase tracking-[0.15em] text-[var(--resume-muted)] ${headingFont}`}
          >
            Selected Projects
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {RESUME.projects.map((project) => (
              <div key={project.name}>
                <p className="text-sm font-semibold text-[var(--resume-text)]">{project.name}</p>
                <p className="text-pretty mt-1 text-xs leading-relaxed text-[var(--resume-text)]">
                  {project.description}
                </p>
                <p className="mt-2 text-[10px] leading-snug text-[var(--resume-muted)]">
                  {project.stack}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
