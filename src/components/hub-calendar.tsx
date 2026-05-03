import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Camera, Wrench, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type CalendarEventKind = "photo" | "gear";
export type CalendarDensity = "week" | "twoweek" | "month";

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD — optional end date for multi-day events */
  endDate?: string | null;
  title: string;
  /** Tailwind background color class for the status pill, e.g. "bg-emerald-500" */
  statusColor: string;
  statusLabel: string;
  href: string;
  /** Subtitle shown in hover preview, e.g. "515 · Sunday AM Worship" */
  subtitle?: string;
  /** Location key for the colored left stripe (515, Cumberland, Trilith) */
  location?: string | null;
  /** Optional fill summary — shown in the hover preview, e.g. "1/2 Point" */
  fillSummary?: string | null;
}

interface HubCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  defaultDensity?: CalendarDensity;
}

const LEGEND: { color: string; label: string }[] = [
  { color: "bg-emerald-500", label: "Approved / Scheduled" },
  { color: "bg-amber-500", label: "Pending / In Review" },
  { color: "bg-blue-500", label: "New" },
  { color: "bg-rose-500", label: "Denied / Declined" },
  { color: "bg-zinc-400", label: "Completed / Archived" },
];

const LOCATION_STRIPES: Record<string, string> = {
  "515": "bg-loc-515",
  Cumberland: "bg-loc-cumberland",
  Trilith: "bg-loc-trilith",
};

function locationStripeClass(loc: string | null | undefined): string {
  if (!loc) return "bg-border";
  return LOCATION_STRIPES[loc] ?? "bg-border";
}

export function HubCalendar({
  events,
  onEventClick,
  defaultDensity = "week",
}: HubCalendarProps) {
  const [cursor, setCursor] = useState<Date>(new Date());
  const [density, setDensity] = useState<CalendarDensity>(defaultDensity);

  const { gridStart, gridEnd, weekRows } = useMemo(() => {
    if (density === "month") {
      const monthStart = startOfMonth(cursor);
      const start = startOfWeek(monthStart, { weekStartsOn: 0 });
      const monthEnd = endOfMonth(cursor);
      const endWeekStart = startOfWeek(monthEnd, { weekStartsOn: 0 });
      const rows = Math.round((endWeekStart.getTime() - start.getTime()) / (7 * 86400000)) + 1;
      return {
        gridStart: start,
        gridEnd: addDays(start, rows * 7 - 1),
        weekRows: rows,
      };
    }
    const rows = density === "week" ? 1 : 2;
    // Week / 2-week views start at the cursor day (today by default), not Sunday
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    return { gridStart: start, gridEnd: addDays(start, rows * 7 - 1), weekRows: rows };
  }, [cursor, density]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      arr.push(d);
      d = addDays(d, 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  const rangeLabel = useMemo(() => {
    if (density === "month") return format(cursor, "MMMM yyyy");
    const sameMonth = isSameMonth(gridStart, gridEnd);
    if (sameMonth) return format(gridStart, "MMMM yyyy");
    if (gridStart.getFullYear() === gridEnd.getFullYear()) {
      return `${format(gridStart, "MMM d")} – ${format(gridEnd, "MMM d, yyyy")}`;
    }
    return `${format(gridStart, "MMM d, yyyy")} – ${format(gridEnd, "MMM d, yyyy")}`;
  }, [cursor, gridStart, gridEnd, density]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const start = parseISO(ev.date);
      const end = ev.endDate ? parseISO(ev.endDate) : start;
      let cur = start;
      while (cur <= end) {
        const key = format(cur, "yyyy-MM-dd");
        const arr = map.get(key) ?? [];
        arr.push(ev);
        map.set(key, arr);
        cur = addDays(cur, 1);
      }
    }
    return map;
  }, [events]);

  function nav(dir: -1 | 1) {
    if (density === "month") {
      setCursor((c) => addMonths(c, dir));
    } else {
      const days = density === "week" ? 7 : 14;
      setCursor((c) => addDays(c, dir * days));
    }
  }

  const minHeight =
    density === "month" ? "min-h-[110px]" : density === "week" ? "min-h-[200px]" : "min-h-[150px]";
  const maxEvents = density === "month" ? 2 : density === "week" ? 6 : 4;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => nav(-1)} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums min-w-[200px] text-center">
            {rangeLabel}
          </h2>
          <Button variant="outline" size="sm" onClick={() => nav(1)} aria-label="Next">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
          {(["week", "twoweek", "month"] as CalendarDensity[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDensity(d)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-sm transition-colors",
                density === d
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d === "week" ? "Week" : d === "twoweek" ? "2 Weeks" : "Month"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {(density === "month"
          ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          : days.slice(0, 7).map((d) => format(d, "EEE"))
        ).map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="bg-muted/40 text-xs uppercase tracking-wider font-medium text-muted-foreground px-2 py-1.5 text-center"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
          const isToday = isSameDay(day, new Date());
          const isOutside = density === "month" && !isSameMonth(day, cursor);
          const weekend = false;
          return (
            <div
              key={key}
              className={cn(
                "p-2 flex flex-col gap-1.5 relative",
                minHeight,
                isPast ? "bg-muted/20" : weekend ? "bg-muted/30" : "bg-background",
                isOutside && "opacity-40",
              )}
            >
              <div
                className={cn(
                  "text-xs font-semibold tabular-nums leading-none self-start flex items-center gap-1",
                  isPast && "text-muted-foreground/60",
                )}
              >
                <span
                  className={cn(
                    isToday &&
                      "inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-medium text-muted-foreground",
                    isPast && "text-muted-foreground/50",
                  )}
                >
                  {format(day, "MMM")}
                </span>
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                {dayEvents.slice(0, maxEvents).map((ev) => (
                  <EventChip key={ev.id + key} ev={ev} onClick={() => onEventClick?.(ev)} />
                ))}
                {dayEvents.length > maxEvents && (
                  <div className="text-[10px] text-muted-foreground px-1 font-medium">
                    +{dayEvents.length - maxEvents} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-muted-foreground">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", l.color)} aria-hidden />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function EventChip({ ev, onClick }: { ev: CalendarEvent; onClick: () => void }) {
  const isPhoto = ev.kind === "photo";
  const Icon = isPhoto ? Camera : Wrench;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "group flex items-center w-full text-left rounded-md border border-transparent bg-transparent hover:bg-accent/60 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors py-1 pr-1.5",
          )}
        >
          <span
            className={cn("w-0.5 self-stretch shrink-0 rounded-full mr-1.5", locationStripeClass(ev.location))}
            aria-hidden
          />
          <span
            className={cn("size-1.5 rounded-full shrink-0 mr-1.5", ev.statusColor)}
            aria-hidden
          />
          <Icon className="size-3 text-muted-foreground shrink-0 mr-1" strokeWidth={2} />
          <span className="text-xs font-medium truncate leading-tight text-foreground flex-1 min-w-0">
            {ev.title}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-64 p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          <Icon className="size-3" />
          {isPhoto ? "Photography" : "Gear"} · {ev.statusLabel}
        </div>
        <div className="font-semibold text-sm leading-tight">{ev.title}</div>
        {ev.subtitle && (
          <div className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {ev.subtitle}
          </div>
        )}
        {ev.fillSummary && (
          <div className="text-xs mt-2 px-2 py-1 rounded bg-muted/60 inline-block">
            {ev.fillSummary}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground mt-2">
          Click to open details
        </div>
      </PopoverContent>
    </Popover>
  );
}
