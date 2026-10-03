export const PLATFORMS = ["mac", "linux", "windows"] as const;
export type Platform = (typeof PLATFORMS)[number];

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
