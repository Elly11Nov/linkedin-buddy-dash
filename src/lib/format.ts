export function formatRelativeTime(isoDate: string): string {
  const time = new Date(isoDate).getTime();
  if (!Number.isFinite(time)) return "recently";
  const diffMs = Date.now() - time;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function linkedInJobSearchUrl(query: string): string {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}`;
}
