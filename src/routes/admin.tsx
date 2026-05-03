import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { HubCalendar, type CalendarEvent } from "@/components/hub-calendar";
import { EventDetailDialog, type DetailEvent } from "@/components/event-detail-dialog";
import { NeedsAttentionStrip } from "@/components/needs-attention-strip";
import { CommandPalette } from "@/components/command-palette";
import { ListSkeleton, CalendarSkeleton } from "@/components/list-skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Wrench, ArrowRight, Inbox, MapPin, User as UserIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  statusBadgeClasses,
  statusLabel,
  statusDotColor,
  gearRequestBadgeClasses,
  gearRequestStatusLabel,
  type PhotoRequestStatus,
  type GearRequestStatus,
} from "@/lib/orgs";
import { locationLabel } from "@/lib/locations";
import { greetingForNow, relativeDayLabel } from "@/lib/relative-date";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard · Passion Photography Hub" },
      { name: "description", content: "Centralized view of upcoming photography and gear requests." },
    ],
  }),
  component: AdminHubPage,
});

interface PhotoRow {
  id: string;
  first_name: string;
  last_name: string;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  spans_multiple_days: boolean;
  status: PhotoRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface GearReqRow {
  id: string;
  requestor_name: string;
  location: string;
  needed_date: string;
  status: GearRequestStatus;
  created_at: string;
  reviewed_at: string | null;
}

interface GearReqItemRow {
  request_id: string;
  gear_id: string;
}

interface OpeningRow {
  id: string;
  request_id: string;
  role: string;
}

interface AssignmentRow {
  id: string;
  opening_id: string;
  request_id: string;
  photographer_id: string;
  claimed_at: string;
}

function AdminHubPage() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <HubView onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function HubView({ onLogout }: { onLogout: () => void }) {
  const { displayName, user } = useAuth();
  const firstName = (displayName ?? user?.email ?? "").split(/[\s@]/)[0] ?? "";

  const [photo, setPhoto] = useState<PhotoRow[]>([]);
  const [gearReqs, setGearReqs] = useState<GearReqRow[]>([]);
  const [gearItems, setGearItems] = useState<GearReqItemRow[]>([]);
  const [openings, setOpenings] = useState<OpeningRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [photographers, setPhotographers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DetailEvent | null>(null);

  async function loadAll() {
    const horizon = format(addDays(new Date(), 90), "yyyy-MM-dd");
    const past = format(addDays(new Date(), -30), "yyyy-MM-dd");
    const [
      { data: p },
      { data: g },
      { data: gi },
      { data: op },
      { data: as },
      { data: ph },
    ] = await Promise.all([
      supabase
        .from("photo_requests")
        .select(
          "id, first_name, last_name, event_name, event_location, event_date, event_end_date, spans_multiple_days, status, created_at, reviewed_at, reviewed_by",
        )
        .gte("event_date", past)
        .lte("event_date", horizon)
        .order("event_date", { ascending: true }),
      supabase
        .from("gear_requests")
        .select("id, requestor_name, location, needed_date, status, created_at, reviewed_at")
        .gte("needed_date", past)
        .lte("needed_date", horizon)
        .order("needed_date", { ascending: true }),
      supabase.from("gear_request_items").select("request_id, gear_id"),
      supabase.from("photo_request_openings").select("id, request_id, role"),
      supabase
        .from("photo_request_assignments")
        .select("id, opening_id, request_id, photographer_id, claimed_at")
        .is("released_at", null),
      supabase.from("photographers").select("id, name"),
    ]);
    setPhoto((p ?? []) as PhotoRow[]);
    setGearReqs((g ?? []) as GearReqRow[]);
    setGearItems((gi ?? []) as GearReqItemRow[]);
    setOpenings((op ?? []) as OpeningRow[]);
    setAssignments((as ?? []) as AssignmentRow[]);
    setPhotographers((ph ?? []) as { id: string; name: string }[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("hub_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photo_requests" },
        () => loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gear_requests" },
        () => loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gear_request_items" },
        () => loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photo_request_assignments" },
        () => loadAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Derived: per-request roster summary
  const rosterByRequest = useMemo(() => {
    const claimedByOpening = new Set(assignments.map((a) => a.opening_id));
    const map = new Map<string, { filled: number; total: number }>();
    for (const op of openings) {
      const cur = map.get(op.request_id) ?? { filled: 0, total: 0 };
      cur.total += 1;
      if (claimedByOpening.has(op.id)) cur.filled += 1;
      map.set(op.request_id, cur);
    }
    return map;
  }, [openings, assignments]);

  const events = useMemo<CalendarEvent[]>(() => {
    const evs: CalendarEvent[] = [];
    for (const p of photo) {
      if (!p.event_date) continue;
      const r = rosterByRequest.get(p.id);
      const fillSummary = r && r.total > 0 ? `${r.filled}/${r.total} spots filled` : null;
      evs.push({
        id: `p-${p.id}`,
        kind: "photo",
        date: p.event_date,
        endDate: p.spans_multiple_days ? p.event_end_date ?? null : null,
        title: p.event_name || `${p.first_name} ${p.last_name}`,
        statusColor: statusDotColor(p.status),
        statusLabel: statusLabel(p.status),
        href: `/admin/requests-photography`,
        subtitle: p.event_location ?? undefined,
        location: p.event_location,
        fillSummary,
      });
    }
    for (const g of gearReqs) {
      evs.push({
        id: `g-${g.id}`,
        kind: "gear",
        date: g.needed_date,
        title: `${g.requestor_name} — ${locationLabel(g.location)}`,
        statusColor: statusDotColor(g.status),
        statusLabel: gearRequestStatusLabel(g.status),
        href: `/admin/requests-gear`,
        subtitle: locationLabel(g.location),
        location: g.location,
      });
    }
    return evs;
  }, [photo, gearReqs, rosterByRequest]);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const horizonKey = format(addDays(new Date(), 30), "yyyy-MM-dd");
  const week14Key = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const week7Key = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const upcomingPhoto = useMemo(
    () =>
      photo
        .filter((p) => p.event_date && p.event_date >= todayKey && p.event_date <= horizonKey)
        .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1)),
    [photo, todayKey, horizonKey],
  );
  const upcomingGear = useMemo(
    () =>
      gearReqs
        .filter((g) => g.needed_date >= todayKey && g.needed_date <= horizonKey)
        .sort((a, b) => (a.needed_date < b.needed_date ? -1 : 1)),
    [gearReqs, todayKey, horizonKey],
  );

  // Needs-attention counts
  const newPhotoCount = photo.filter((p) => p.status === "new").length;
  const pendingGearCount = gearReqs.filter((g) => g.status === "pending").length;
  const unstaffedNext7 = useMemo(() => {
    return photo.filter((p) => {
      if (!p.event_date || p.event_date < todayKey || p.event_date > week7Key) return false;
      const r = rosterByRequest.get(p.id);
      if (!r || r.total === 0) return false;
      return r.filled < r.total;
    }).length;
  }, [photo, rosterByRequest, todayKey, week7Key]);

  const attentionTotal = newPhotoCount + unstaffedNext7 + pendingGearCount;

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} />
      <CommandPalette />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero greeting */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {greetingForNow()}
              {firstName ? `, ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {attentionTotal === 0
                ? "All caught up — nothing needs your attention right now."
                : `${attentionTotal} ${attentionTotal === 1 ? "thing needs" : "things need"} your attention today.`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const evt = new KeyboardEvent("keydown", { key: "k", metaKey: true });
              window.dispatchEvent(evt);
            }}
            className="text-muted-foreground"
          >
            <Search className="size-4" />
            Search
            <kbd className="ml-2 hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
        </div>

        {/* Needs attention */}
        <NeedsAttentionStrip
          newPhotoCount={newPhotoCount}
          unstaffedNext7={unstaffedNext7}
          pendingGearCount={pendingGearCount}
        />

        {/* Calendar */}
        <section>
          {loading ? (
            <CalendarSkeleton />
          ) : (
            <HubCalendar
              events={events}
              defaultDensity="week"
              onEventClick={(ev) => {
                const isPhoto = ev.id.startsWith("p-");
                setSelected({
                  kind: isPhoto ? "photo" : "gear",
                  id: ev.id.slice(2),
                });
              }}
            />
          )}
        </section>

        {/* Upcoming lists */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold tracking-tight inline-flex items-center gap-2">
                    <Camera className="size-4 text-muted-foreground" />
                    Upcoming Photography
                  </h2>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/requests-photography">
                      View all <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
                {loading ? (
                  <ListSkeleton rows={3} />
                ) : upcomingPhoto.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <Camera className="size-6 mx-auto text-muted-foreground/60 mb-2" />
                    <div className="text-sm text-muted-foreground mb-3">
                      No photography requests in the next 30 days.
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/requests-photography">View all requests</Link>
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {upcomingPhoto.slice(0, 6).map((p) => {
                      const rel = p.event_date ? relativeDayLabel(p.event_date) : null;
                      const r = rosterByRequest.get(p.id);
                      return (
                        <Link
                          key={p.id}
                          to="/admin/requests-photography"
                          search={{ highlight: p.id }}
                          className="block"
                        >
                          <Card className="p-4 hover:border-foreground/30 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span
                                    className={cn(
                                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                                      statusBadgeClasses(p.status),
                                    )}
                                  >
                                    {statusLabel(p.status)}
                                  </span>
                                  {r && r.total > 0 && (
                                    <span
                                      className={cn(
                                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                                        r.filled >= r.total
                                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
                                      )}
                                    >
                                      {r.filled}/{r.total} staffed
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold truncate">
                                  {p.event_name || `${p.first_name} ${p.last_name}`}
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                  {p.event_date && (
                                    <span>
                                      {format(parseISO(p.event_date), "EEE, MMM d")}
                                      {rel && (
                                        <span className="ml-1 font-medium text-foreground/80">
                                          · {rel}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {p.event_location && (
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin className="size-3" />
                                      {p.event_location}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1">
                                    <UserIcon className="size-3" />
                                    {p.first_name} {p.last_name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold tracking-tight inline-flex items-center gap-2">
                    <Wrench className="size-4 text-muted-foreground" />
                    Upcoming Gear
                  </h2>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/requests-gear">
                      View all <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
                {loading ? (
                  <ListSkeleton rows={3} />
                ) : upcomingGear.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <Inbox className="size-6 mx-auto text-muted-foreground/60 mb-2" />
                    <div className="text-sm text-muted-foreground mb-3">
                      No gear requests in the next 30 days.
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/requests-gear">View all gear requests</Link>
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {upcomingGear.slice(0, 6).map((g) => {
                      const count = gearItems.filter((i) => i.request_id === g.id).length;
                      const rel = relativeDayLabel(g.needed_date);
                      return (
                        <Link key={g.id} to="/admin/requests-gear" search={{ highlight: g.id }} className="block">
                          <Card className="p-4 hover:border-foreground/30 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span
                                    className={cn(
                                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                                      gearRequestBadgeClasses(g.status),
                                    )}
                                  >
                                    {gearRequestStatusLabel(g.status)}
                                  </span>
                                </div>
                                <div className="font-semibold truncate">
                                  {g.requestor_name}
                                  <span className="text-muted-foreground font-normal">
                                    {" "}
                                    · {count} item{count === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                  <span>
                                    {format(parseISO(g.needed_date), "EEE, MMM d")}
                                    {rel && (
                                      <span className="ml-1 font-medium text-foreground/80">
                                        · {rel}
                                      </span>
                                    )}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="size-3" />
                                    {locationLabel(g.location)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
        </section>
      </div>

      <EventDetailDialog
        event={selected}
        onClose={() => setSelected(null)}
        onChanged={() => loadAll()}
      />
    </main>
  );
}
