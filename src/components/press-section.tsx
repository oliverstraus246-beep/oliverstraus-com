// Not currently rendered (see page.tsx) -- every previous entry here was
// either unverifiable or just self-referential (linked back to
// oliverstraus.com itself, not real outside coverage). Oliver has
// confirmed real external coverage exists; this section comes back once
// those actual links are in hand. Never repopulate with placeholder or
// self-referential entries -- real outside sources only.
const PRESS: readonly { title: string; source: string; href: string }[] = [];

export function PressSection() {
  return (
    <section id="press" className="relative py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          04 / Press
        </p>
        <h2 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          Coverage.
        </h2>

        <div className="mt-12 divide-y divide-border border-t border-border">
          {PRESS.map((item) => (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between py-5 transition-colors hover:text-accent-blue"
            >
              <span className="text-lg font-medium">{item.title}</span>
              <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground group-hover:text-accent-blue">
                {item.source}
                <span aria-hidden="true">&rarr;</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
