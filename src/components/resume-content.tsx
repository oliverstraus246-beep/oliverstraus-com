import { RESUME } from "@/lib/resume";

/**
 * Deliberately NOT styled like the rest of the site. A resume that reads
 * as a dark hacker-terminal page would work against itself in front of a
 * recruiter or admissions reader -- this renders as a conventional,
 * print-ready light document (off-white paper tone, not stark white)
 * regardless of the site's own dark theme. Shared between the in-page
 * modal and window.print() (see resume-modal.tsx and the
 * .resume-print-area rules in globals.css).
 */
export function ResumeContent() {
  return (
    <div className="resume-print-area flex flex-col bg-neutral-50 text-neutral-900 sm:flex-row">
      <aside className="shrink-0 bg-neutral-100 px-8 py-10 sm:w-64 sm:px-6 sm:py-12">
        <h1 className="text-balance font-serif text-3xl font-medium leading-tight tracking-tight text-neutral-900">
          {RESUME.name}
        </h1>
        <p className="mt-1.5 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-neutral-500">
          {RESUME.title}
        </p>

        <div className="mt-6 space-y-0.5 border-t border-neutral-300 pt-6 text-xs text-neutral-600">
          <p>{RESUME.location}</p>
          <p className="tabular-nums">{RESUME.phone}</p>
          <p>{RESUME.email}</p>
          <p>{RESUME.site}</p>
        </div>

        <div className="mt-8 border-t border-neutral-300 pt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
            Skills
          </h2>
          <div className="mt-3 space-y-3">
            {RESUME.skills.map((skill) => (
              <div key={skill.category}>
                <p className="text-xs font-semibold text-neutral-900">{skill.category}</p>
                <p className="text-pretty text-xs leading-relaxed text-neutral-600">
                  {skill.items}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-300 pt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
            Education
          </h2>
          <p className="mt-3 text-xs font-semibold text-neutral-900">
            {RESUME.education.program}
          </p>
          <p className="text-pretty text-xs leading-relaxed text-neutral-600">
            {RESUME.education.detail}
          </p>
        </div>

        <div className="mt-8 border-t border-neutral-300 pt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
            Community
          </h2>
          <p className="mt-3 text-xs font-semibold text-neutral-900">
            {RESUME.community.org} &middot; {RESUME.community.role}
          </p>
          <p className="text-pretty text-xs leading-relaxed text-neutral-600">
            {RESUME.community.detail}
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-8 py-10 sm:px-10 sm:py-12">
        <div className="grid grid-cols-3 gap-4 border-b border-neutral-200 pb-6">
          {RESUME.stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold tabular-nums text-neutral-900">{stat.value}</p>
              <p className="mt-0.5 text-[10px] uppercase leading-snug tracking-wide text-neutral-500">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <p className="text-pretty mt-6 text-sm leading-relaxed text-neutral-700">
          {RESUME.summary}
        </p>

        <div className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">
            Professional Experience
          </h2>
          <div className="relative mt-4 space-y-7 border-l border-neutral-200 pl-6">
            {RESUME.experience.map((job) => (
              <div key={job.role + job.org} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full border-2 border-neutral-50 bg-neutral-400"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <p className="text-sm font-semibold text-neutral-900">{job.role}</p>
                  <p className="shrink-0 text-xs tabular-nums text-neutral-500">{job.dates}</p>
                </div>
                <p className="text-xs text-neutral-600">
                  {job.org} &middot; {job.context}
                </p>
                <ul className="text-pretty mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-neutral-700">
                  {job.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-200 pt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">
            Selected Projects
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {RESUME.projects.map((project) => (
              <div key={project.name}>
                <p className="text-sm font-semibold text-neutral-900">{project.name}</p>
                <p className="text-pretty mt-1 text-xs leading-relaxed text-neutral-700">
                  {project.description}
                </p>
                <p className="mt-2 text-[10px] leading-snug text-neutral-500">{project.stack}</p>
                {"href" in project && project.href && (
                  <p className="mt-1 text-[10px] text-neutral-500">{project.href}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
