import { addDays, format, parseISO } from "date-fns";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface StaffingItem {
  request_id: string;
  event_date: string;
  filled: number;
  total: number;
  status: "denied" | "scheduled" | "open" | "partial" | "full";
}

interface Props {
  items: StaffingItem[];
}

/**
 * Horizontal segmented bar showing staffing health for the next 14 days.
 * Each segment is a day; color reflects worst case across that day's events.
 */
export function StaffingHealthBar({ items }: Props) {
  const days = useMemo(() => {
    const out: { key: string; date: Date; tone: "empty" | "partial" | "full" | "denied" | "none" }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(new Date(), i);
      const key = format(d, "yyyy-MM-dd");
      const today = items.filter((it) => it.event_date === key);
      let tone: "empty" | "partial" | "full" | "denied" | "none" = "none";
      if (today.length === 0) tone = "none";
      else if (today.some((t) => t.status === "denied")) tone = "denied";
      else if (today.some((t) => t.filled === 0 && t.total > 0)) tone = "empty";
      else if (today.some((t) => t.filled < t.total)) tone = "partial";
      else tone = "full";
      out.push({ key, date: d, tone });
    }
    return out;
  }, [items]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Staffing — next 14 days
        </span>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Legend tone="full" label="Full" />
          <Legend tone="partial" label="Partial" />
          <Legend tone="empty" label="Empty" />
        </div>
      </div>
      <div className="flex items-end gap-1 h-10" role="list">
        {days.map((d) => (
          <div
            key={d.key}
            role="listitem"
            title={`${format(d.date, "EEE MMM d")} · ${labelFor(d.tone)}`}
            className={cn(
              "flex-1 rounded-sm transition-colors",
              d.tone === "full" && "bg-emerald-500 h-full",
              d.tone === "partial" && "bg-amber-500 h-full",
              d.tone === "empty" && "bg-rose-500 h-full",
              d.tone === "denied" && "bg-zinc-400 h-full",
              d.tone === "none" && "bg-muted h-3 self-center",
            )}
            aria-label={`${format(d.date, "EEE MMM d")} ${labelFor(d.tone)}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground tabular-nums">
        <span>{format(days[0].date, "MMM d")}</span>
        <span>{format(days[days.length - 1].date, "MMM d")}</span>
      </div>
    </div>
  );
}

function labelFor(tone: "empty" | "partial" | "full" | "denied" | "none"): string {
  switch (tone) {
    case "full":
      return "Fully staffed";
    case "partial":
      return "Partially staffed";
    case "empty":
      return "No coverage";
    case "denied":
      return "Denied";
    case "none":
      return "No events";
  }
}

function Legend({ tone, label }: { tone: "full" | "partial" | "empty"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "size-2 rounded-sm",
          tone === "full" && "bg-emerald-500",
          tone === "partial" && "bg-amber-500",
          tone === "empty" && "bg-rose-500",
        )}
      />
      {label}
    </span>
  );
}
