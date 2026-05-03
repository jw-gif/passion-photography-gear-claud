import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, isSameDay, parseISO, startOfWeek, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { locationClasses, locationLabel } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { Input } from "@/components/ui/input";
import { GearIcon } from "@/lib/gear-icons";
import { HubHeader } from "@/components/hub-header";
import { AdminBreadcrumb } from "@/components/admin-breadcrumb";
import {
  Camera,
  ArrowLeft,
  Settings,
  History,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Trash2,
  Calendar as CalendarIcon,
  ClipboardList,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/requests-gear")({
  validateSearch: (s: Record<string, unknown>) => ({
    highlight: typeof s.highlight === "string" ? s.highlight : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Gear Requests · Passion Photography Hub" },
      { name: "description", content: "Approve or deny gear requests and view upcoming needs." },
    ],
  }),
  component: RequestsRoute,
});

type RequestStatus = "pending" | "approved" | "denied";

interface GearRequest {
  id: string;
  requestor_name: string;
  location: string;
  needed_date: string; // YYYY-MM-DD
  notes: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface GearRequestItem {
  id: string;
  request_id: string;
  gear_id: string;
}

interface GearRow {
  id: string;
  name: string;
  icon_kind: string | null;
}

function RequestsRoute() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <RequestsView onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function RequestsView({ onLogout }: { onLogout: () => void }) {
  const { displayName } = useAuth();
  const reviewerName = displayName ?? "Admin";
  const { highlight } = Route.useSearch();
  const [requests, setRequests] = useState<GearRequest[]>([]);
  const [items, setItems] = useState<GearRequestItem[]>([]);
  const [gear, setGear] = useState<GearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const highlightAppliedRef = useRef(false);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );

  async function loadAll() {
    const [{ data: r }, { data: i }, { data: g }] = await Promise.all([
      supabase.from("gear_requests").select("*").order("needed_date", { ascending: true }),
      supabase.from("gear_request_items").select("*"),
      supabase.from("gear").select("id, name, icon_kind").order("name", { ascending: true }),
    ]);
    setRequests((r || []) as GearRequest[]);
    setItems((i || []) as GearRequestItem[]);
    setGear((g || []) as GearRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("gear-requests-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gear_requests" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "gear_request_items" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!highlight || loading || highlightAppliedRef.current) return;
    highlightAppliedRef.current = true;
    setTab("all");
    setTimeout(() => {
      const el = document.querySelector(`[data-request-id="${highlight}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("ring-2", "ring-primary");
      setTimeout(() => el?.classList.remove("ring-2", "ring-primary"), 3000);
    }, 100);
  }, [highlight, loading]);

  const gearMap = useMemo(() => {
    const m = new Map<string, GearRow>();
    for (const g of gear) m.set(g.id, g);
    return m;
  }, [gear]);

  const itemsByRequest = useMemo(() => {
    const m = new Map<string, GearRequestItem[]>();
    for (const it of items) {
      const arr = m.get(it.request_id) || [];
      arr.push(it);
      m.set(it.request_id, arr);
    }
    return m;
  }, [items]);

  const visible = useMemo(() => {
    if (tab === "pending") return requests.filter((r) => r.status === "pending");
    return requests;
  }, [requests, tab]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );

  // Week view: 7 days starting Sunday
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const requestsByDay = useMemo(() => {
    const m = new Map<string, GearRequest[]>();
    for (const r of requests) {
      if (r.status === "denied") continue; // hide denied from calendar
      const key = r.needed_date;
      const arr = m.get(key) || [];
      arr.push(r);
      m.set(key, arr);
    }
    return m;
  }, [requests]);

  async function setStatus(req: GearRequest, status: RequestStatus) {
    const previous = req.status;
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status, reviewed_by: reviewerName, reviewed_at: new Date().toISOString() } : r)),
    );
    const { error } = await supabase
      .from("gear_requests")
      .update({ status, reviewed_by: reviewerName, reviewed_at: new Date().toISOString() })
      .eq("id", req.id);
    if (error) {
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: previous } : r)));
      toast.error("Couldn't update request", { description: error.message });
      return;
    }
    toast.success(
      status === "approved"
        ? `Approved request from ${req.requestor_name}`
        : `Denied request from ${req.requestor_name}`,
    );
  }

  async function deleteRequest(req: GearRequest) {
    if (!confirm(`Delete request from ${req.requestor_name}?`)) return;
    const { error } = await supabase.from("gear_requests").delete().eq("id", req.id);
    if (error) {
      toast.error("Couldn't delete request", { description: error.message });
      return;
    }
    toast.success("Request deleted");
  }

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Gear Requests" subtitle="Approve, deny & schedule" />
      <AdminBreadcrumb items={[{ label: "Gear", to: "/admin/gear" }, { label: "Requests" }]} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Weekly calendar */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <CalendarIcon className="size-4 text-muted-foreground" />
                Upcoming week
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => subDays(w, 7))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, 7))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayRequests = requestsByDay.get(key) || [];
              const isToday = isSameDay(day, new Date());
              return (
                <Card
                  key={key}
                  className={cn(
                    "p-3 min-h-[120px] flex flex-col",
                    isToday && "ring-2 ring-primary",
                  )}
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      {format(day, "EEE")}
                    </div>
                    <div className={cn("text-lg font-bold leading-none", isToday && "text-primary")}>
                      {format(day, "d")}
                    </div>
                  </div>
                  {dayRequests.length === 0 ? (
                    <div className="text-xs text-muted-foreground/60 italic mt-1">—</div>
                  ) : (
                    <div className="space-y-1.5">
                      {dayRequests.map((r) => {
                        const reqItems = itemsByRequest.get(r.id) || [];
                        return (
                          <div
                            key={r.id}
                            className={cn(
                              "rounded-md px-2 py-1.5 text-[11px] leading-tight border",
                              r.status === "approved"
                                ? "bg-loc-trilith/10 border-loc-trilith/40"
                                : r.status === "pending"
                                  ? "bg-loc-cumberland/10 border-loc-cumberland/40"
                                  : "bg-muted border-border",
                            )}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", locationClasses(r.location))}>
                                {locationLabel(r.location)}
                              </span>
                              <span className="font-semibold truncate">{r.requestor_name}</span>
                            </div>
                            <div className="text-muted-foreground truncate">
                              {reqItems.length} item{reqItems.length === 1 ? "" : "s"}
                              {r.status === "pending" && " · pending"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* Request list */}
        <section>
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />
              All requests
            </h2>
            <div className="inline-flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setTab("pending")}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                  tab === "pending" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Pending {pendingCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-xs">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTab("all")}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                  tab === "all" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-muted-foreground text-sm">Loading requests…</div>
          ) : visible.length === 0 ? (
            <Card className="py-12 text-center border-dashed">
              <Inbox className="size-8 text-muted-foreground/50 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">
                {tab === "pending" ? "No pending requests" : "No requests yet"}
              </div>
              <Button asChild variant="link" size="sm" className="mt-2">
                <Link to="/request-gear">Open request form →</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {visible.map((r) => {
                const reqItems = itemsByRequest.get(r.id) || [];
                return (
                  <Card key={r.id} data-request-id={r.id} className="p-4 sm:p-5 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", locationClasses(r.location))}>
                            {locationLabel(r.location)}
                          </span>
                          <span className="font-semibold">{r.requestor_name}</span>
                          <span className="text-muted-foreground text-sm">
                            · needs {format(parseISO(r.needed_date), "EEE, MMM d")}
                          </span>
                          <StatusBadge status={r.status} />
                        </div>
                        {reqItems.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {reqItems.map((it) => {
                              const g = gearMap.get(it.gear_id);
                              if (!g) return null;
                              return (
                                <span
                                  key={it.id}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs font-medium"
                                >
                                  <GearIcon name={g.name} iconKind={g.icon_kind} className="size-3.5 text-muted-foreground" />
                                  {g.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {r.notes && (
                          <div className="mt-2 text-sm text-muted-foreground italic">
                            "{r.notes}"
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          Submitted {format(parseISO(r.created_at), "MMM d, h:mm a")}
                          {r.reviewed_at && r.status !== "pending" && (
                            <> · {r.status} {format(parseISO(r.reviewed_at), "MMM d, h:mm a")}</>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:w-32 shrink-0">
                        {r.status === "pending" ? (
                          <>
                            <Button size="sm" onClick={() => setStatus(r, "approved")}>
                              <Check className="size-4" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setStatus(r, "denied")}>
                              <X className="size-4" /> Deny
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(r, "pending")}>
                              Reset
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteRequest(r)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, string> = {
    pending: "bg-loc-cumberland/15 text-loc-cumberland-foreground border-loc-cumberland/40",
    approved: "bg-loc-trilith/15 text-loc-trilith border-loc-trilith/40",
    denied: "bg-destructive/10 text-destructive border-destructive/40",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border", map[status])}>
      {status}
    </span>
  );
}
