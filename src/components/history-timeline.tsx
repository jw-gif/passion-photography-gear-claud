import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { CircleDot, UserCheck, Edit3, Send } from "lucide-react";
import { shortRelative } from "@/lib/relative-date";

interface Props {
  requestId: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

interface Claim {
  id: string;
  claimed_at: string;
  released_at: string | null;
  photographer_name: string;
}

export function HistoryTimeline({ requestId, createdAt, reviewedAt, reviewedBy }: Props) {
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("photo_request_assignments")
        .select("id, claimed_at, released_at, photographer_id, photographers!inner(name)")
        .eq("request_id", requestId)
        .order("claimed_at", { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as Array<{
        id: string;
        claimed_at: string;
        released_at: string | null;
        photographers: { name: string } | { name: string }[];
      }>;
      setClaims(
        rows.map((r) => ({
          id: r.id,
          claimed_at: r.claimed_at,
          released_at: r.released_at,
          photographer_name: Array.isArray(r.photographers)
            ? r.photographers[0]?.name ?? "Photographer"
            : r.photographers?.name ?? "Photographer",
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const events: { id: string; icon: React.ReactNode; title: string; at: string }[] = [
    {
      id: "submitted",
      icon: <Send className="size-3" />,
      title: "Submitted by requestor",
      at: createdAt,
    },
  ];
  if (reviewedAt) {
    events.push({
      id: "reviewed",
      icon: <Edit3 className="size-3" />,
      title: reviewedBy ? `Reviewed by ${reviewedBy}` : "Reviewed",
      at: reviewedAt,
    });
  }
  for (const c of claims) {
    events.push({
      id: `claim-${c.id}`,
      icon: <UserCheck className="size-3" />,
      title: c.released_at
        ? `${c.photographer_name} claimed, then released`
        : `${c.photographer_name} claimed`,
      at: c.claimed_at,
    });
    if (c.released_at) {
      events.push({
        id: `release-${c.id}`,
        icon: <CircleDot className="size-3" />,
        title: `${c.photographer_name} released spot`,
        at: c.released_at,
      });
    }
  }

  events.sort((a, b) => (a.at < b.at ? -1 : 1));

  return (
    <ol className="space-y-3 relative">
      <span className="absolute left-2.5 top-2 bottom-2 w-px bg-border" aria-hidden />
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 relative">
          <span className="size-5 rounded-full bg-muted border-2 border-background text-muted-foreground inline-flex items-center justify-center shrink-0 z-10">
            {e.icon}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="text-sm font-medium">{e.title}</div>
            <div className="text-xs text-muted-foreground">
              {format(parseISO(e.at), "MMM d, yyyy 'at' h:mm a")} · {shortRelative(e.at)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
