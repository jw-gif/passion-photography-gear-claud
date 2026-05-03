import { Card } from "@/components/ui/card";
import { Activity, Camera, Wrench, UserCheck, Inbox } from "lucide-react";
import { shortRelative } from "@/lib/relative-date";

export interface ActivityItem {
  id: string;
  kind: "photo_new" | "photo_reviewed" | "gear_new" | "gear_reviewed" | "claim";
  title: string;
  subtitle?: string;
  at: string; // iso
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-tight">Recent activity</h3>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">
          No activity yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 10).map((it) => (
            <li key={it.id} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 size-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                {iconFor(it.kind)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm leading-tight font-medium truncate">{it.title}</div>
                {it.subtitle && (
                  <div className="text-xs text-muted-foreground truncate">{it.subtitle}</div>
                )}
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  {shortRelative(it.at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function iconFor(kind: ActivityItem["kind"]) {
  switch (kind) {
    case "photo_new":
      return <Camera className="size-3.5" />;
    case "photo_reviewed":
      return <Camera className="size-3.5" />;
    case "gear_new":
      return <Inbox className="size-3.5" />;
    case "gear_reviewed":
      return <Wrench className="size-3.5" />;
    case "claim":
      return <UserCheck className="size-3.5" />;
  }
}
