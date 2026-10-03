/** Short relative time for feed cards: "now", "5m", "2h", "3d", then a date. */
export function relativeTime(date: Date | string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(date).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
