import type { Metadata } from "next";
import { loginAdmin } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { next = "/admin", error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 pb-16 pt-28 text-foreground sm:pt-32">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Admin</p>
      <h1 className="mt-1 text-2xl font-black tracking-tight">Sign in</h1>

      {error && (
        <p className="mt-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <form action={loginAdmin} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <div>
          <label htmlFor="username" className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoFocus
            required
            className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent-blue focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent-blue focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="mt-2 h-11 rounded-full border border-border font-mono text-xs uppercase tracking-widest transition-colors duration-150 hover:border-accent-blue hover:text-accent-blue"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        Sessions last 7 days. Changing the password signs out every device.
      </p>
    </div>
  );
}
