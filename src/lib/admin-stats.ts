// Shared by every page under src/app/admin -- all of them read Supabase
// with the service_role key server-side and reduce to small "top N" lists,
// so this is the one place that logic lives instead of copy-pasted three
// times.
export function supabaseReadHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export function countBy(values: (string | null)[], fallback: string, limit = 10): [string, number][] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw?.trim() || fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

// Minimal CSV writer -- one column set, no nested/multi-line fields beyond
// what double-quoting handles. Good enough for the admin export buttons;
// not a general-purpose CSV library.
export function toCsv(rows: Record<string, string | number | boolean | null>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(String(row[h] ?? ""))).join(","));
  }
  return lines.join("\n");
}

export function csvDownloadHref(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}
