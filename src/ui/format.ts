export const fmtPct = (p: number | null | undefined, digits = 2) =>
  p == null ? '—' : `${p.toFixed(digits).replace(/\.?0+$/, '')}%`;

export const fmtPts = (n: number | null | undefined) =>
  n == null ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '');

export function timeAgo(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}
