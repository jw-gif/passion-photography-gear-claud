import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { AlertCircle, CalendarClock, Inbox, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tile {
  label: string;
  count: number;
  to: string;
  search?: Record<string, string>;
  tone: "rose" | "amber" | "sky";
  icon: React.ReactNode;
  hint?: string;
}

interface NeedsAttentionStripProps {
  newPhotoCount: number;
  unstaffedNext7: number;
  pendingGearCount: number;
}

export function NeedsAttentionStrip({
  newPhotoCount,
  unstaffedNext7,
  pendingGearCount,
}: NeedsAttentionStripProps) {
  const tiles: Tile[] = [
    {
      label: "New requests",
      count: newPhotoCount,
      to: "/admin/requests-photography",
      tone: "rose",
      icon: <AlertCircle className="size-4" />,
      hint: "Awaiting first review",
    },
    {
      label: "Unstaffed in 7 days",
      count: unstaffedNext7,
      to: "/admin/requests-photography",
      tone: "amber",
      icon: <CalendarClock className="size-4" />,
      hint: "Approved but no photographer",
    },
    {
      label: "Pending gear",
      count: pendingGearCount,
      to: "/admin/requests-gear",
      tone: "sky",
      icon: <Inbox className="size-4" />,
      hint: "Awaiting approval",
    },
  ];

  const allClear = tiles.every((t) => t.count === 0);

  if (allClear) {
    return (
      <Card className="p-4 flex items-center gap-3 border-emerald-300 dark:border-emerald-800">
        <div className="size-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All clear</div>
          <div className="text-xs text-muted-foreground">No requests need your attention right now.</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {tiles.map((t) => (
        <Link
          key={t.label}
          to={t.to}
          className={cn("block", t.count === 0 && "pointer-events-none")}
          tabIndex={t.count === 0 ? -1 : undefined}
        >
          <Card
            className={cn(
              "p-4 transition-all relative overflow-hidden",
              t.count > 0 && "hover:shadow-md hover:-translate-y-0.5",
              t.count > 0 && t.tone === "rose" && "border-rose-300 dark:border-rose-800",
              t.count > 0 && t.tone === "amber" && "border-amber-300 dark:border-amber-800",
              t.count > 0 && t.tone === "sky" && "border-sky-300 dark:border-sky-800",
              t.count === 0 && "opacity-40",
            )}
          >
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                t.tone === "rose" && "bg-rose-500",
                t.tone === "amber" && "bg-amber-500",
                t.tone === "sky" && "bg-sky-500",
                t.count === 0 && "opacity-30",
              )}
              aria-hidden
            />
            <div className="flex items-start justify-between gap-3 pl-2">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1.5">
                  {t.icon}
                  {t.label}
                </div>
                <div className="mt-1 text-3xl font-bold tabular-nums leading-none">
                  {t.count}
                </div>
                {t.hint && (
                  <div className="mt-1 text-xs text-muted-foreground">{t.hint}</div>
                )}
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
