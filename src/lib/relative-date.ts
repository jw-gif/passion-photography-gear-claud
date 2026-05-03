import { differenceInCalendarDays, parseISO } from "date-fns";

/**
 * Returns a friendly relative day label like "Today", "Tomorrow", "In 3 days",
 * "Yesterday", "3 days ago". For dates more than 14 days out it returns null
 * so callers can fall back to the absolute date alone.
 */
export function relativeDayLabel(iso: string): string | null {
  try {
    const target = parseISO(iso);
    const diff = differenceInCalendarDays(target, new Date());
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff > 1 && diff <= 14) return `In ${diff} days`;
    if (diff < -1 && diff >= -14) return `${Math.abs(diff)} days ago`;
    return null;
  } catch {
    return null;
  }
}

/**
 * Compact "12m ago" / "3h ago" / "2d ago" style for activity feeds.
 */
export function shortRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  const diffW = Math.round(diffD / 7);
  if (diffW < 8) return `${diffW}w ago`;
  return `${Math.round(diffD / 30)}mo ago`;
}

export function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 5) return "Hello";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Hello";
}
