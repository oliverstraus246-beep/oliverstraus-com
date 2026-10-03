// "linux" is the generic tarball fallback for any distro; "arch" and
// "debian" are real, properly-formed packages for those two ecosystems
// specifically (see scripts/lib/release-project.mjs's buildDebPackage/
// buildArchPackage). The download modal groups mac/arch/debian/linux/windows
// as "macOS", "Arch Linux", "Debian/Ubuntu", "Other Linux (tar.gz)",
// "Windows" -- Linux shows as one expandable entry point that reveals
// arch/debian/linux as its own second step.
export const PLATFORMS = ["mac", "linux", "windows", "arch", "debian"] as const;
export type Platform = (typeof PLATFORMS)[number];

// The platforms grouped under the "Linux" umbrella in the UI.
export const LINUX_PLATFORMS = ["arch", "debian", "linux"] as const satisfies readonly Platform[];
export type LinuxPlatform = (typeof LINUX_PLATFORMS)[number];

export function isPlatform(value: string | null): value is Platform {
  return value !== null && (PLATFORMS as readonly string[]).includes(value);
}

export interface DownloadReleaseRow {
  id: string;
  project: string;
  platform: Platform;
  version: string;
  blob_url: string;
  sha256: string;
  size_bytes: number;
  is_current: boolean;
  created_at: string;
}

// Defensive selector -- works whether the caller already filtered the
// Supabase query to project+platform+is_current=true, or handed over a
// broader row set. Used by the download route (Task 5).
export function pickCurrentRelease(
  rows: DownloadReleaseRow[],
  project: string,
  platform: Platform,
): DownloadReleaseRow | null {
  return (
    rows.find((r) => r.project === project && r.platform === platform && r.is_current) ?? null
  );
}
