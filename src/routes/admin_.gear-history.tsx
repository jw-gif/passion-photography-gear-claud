import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LOCATIONS, locationClasses, locationLabel, formatDate } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { Camera, ArrowLeft, Settings, Inbox, Users } from "lucide-react";
import { GearIcon } from "@/lib/gear-icons";
import { HubHeader } from "@/components/hub-header";
import { AdminBreadcrumb } from "@/components/admin-breadcrumb";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin_/gear-history")({
  head: () => ({
    meta: [
      { title: "Gear Activity Log · Passion Photography Hub" },
      { name: "description", content: "Chronological log of all gear location changes." },
    ],
  }),
  component: HistoryPage,
});

interface HistoryRow {
  id: string;
  gear_id: string;
  location: string;
  sub_location: string | null;
  note: string | null;
  timestamp: string;
  moved_by: string | null;
}

interface GearRow {
  id: string;
  name: string;
  icon_kind: string | null;
}

const PAGE_SIZE = 200;

function HistoryPage() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <HistoryView onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function HistoryView({ onLogout }: { onLogout: () => void }) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [gear, setGear] = useState<GearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [locFilter, setLocFilter] = useState<string>("all");
  const [gearFilter, setGearFilter] = useState<string>("all");

  async function loadAll(currentLimit: number) {
    setLoading(true);
    const [{ data: h }, { data: g }] = await Promise.all([
      supabase
        .from("gear_history")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(currentLimit + 1),
      supabase.from("gear").select("id, name, icon_kind").order("id", { ascending: true }),
    ]);
    const rows = (h || []) as HistoryRow[];
    setHasMore(rows.length > currentLimit);
    setHistory(rows.slice(0, currentLimit));
    setGear((g || []) as GearRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll(limit);
    const channel = supabase
      .channel("gear-history-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gear_history" },
        () => loadAll(limit),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const gearMap = useMemo(() => {
    const m = new Map<string, { name: string; icon_kind: string | null }>();
    for (const g of gear) m.set(g.id, { name: g.name, icon_kind: g.icon_kind });
    return m;
  }, [gear]);

  const filtered = useMemo(() => {
    return history.filter((h) => {
      if (locFilter !== "all" && h.location !== locFilter) return false;
      if (gearFilter !== "all" && String(h.gear_id) !== gearFilter) return false;
      return true;
    });
  }, [history, locFilter, gearFilter]);

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Activity Log" subtitle="Gear location changes" />
      <AdminBreadcrumb items={[{ label: "Gear", to: "/admin/gear" }, { label: "Activity Log" }]} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">
              Location
            </label>
            <Select value={locFilter} onValueChange={setLocFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>{locationLabel(loc)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">
              Gear
            </label>
            <Select value={gearFilter} onValueChange={setGearFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All gear</SelectItem>
                {gear.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && history.length === 0 ? (
          <div className="text-muted-foreground text-sm">Loading activity…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-12 text-center">
            No activity matches these filters
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Card className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">When</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Gear</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">By</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((h) => (
                      <tr key={h.id} className="border-t border-border align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          <span title={new Date(h.timestamp).toLocaleString()}>
                            {formatDate(h.timestamp)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to="/"
                            search={{ gear: h.gear_id }}
                            className="font-medium hover:underline inline-flex items-center gap-2"
                          >
                            <GearIcon
                              name={gearMap.get(h.gear_id)?.name ?? ""}
                              iconKind={gearMap.get(h.gear_id)?.icon_kind}
                              className="size-4 text-muted-foreground"
                            />
                            {gearMap.get(h.gear_id)?.name ?? `Gear #${h.gear_id}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-bold",
                                locationClasses(h.location),
                              )}
                            >
                              {locationLabel(h.location)}
                            </span>
                            {h.sub_location && (
                              <span className="text-xs font-medium text-foreground/80">
                                {h.sub_location}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {h.moved_by ?? <span className="text-muted-foreground opacity-50">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground italic">
                          {h.note ? `"${h.note}"` : <span className="opacity-50">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((h) => (
                <Card key={h.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold",
                        locationClasses(h.location),
                      )}
                    >
                      {locationLabel(h.location)}
                    </span>
                    {h.sub_location && (
                      <span className="text-xs font-medium text-foreground/80">
                        {h.sub_location}
                      </span>
                    )}
                    <span
                      className="text-xs text-muted-foreground ml-auto"
                      title={new Date(h.timestamp).toLocaleString()}
                    >
                      {formatDate(h.timestamp)}
                    </span>
                  </div>
                  <Link
                    to="/"
                    search={{ gear: h.gear_id }}
                    className="font-semibold hover:underline inline-flex items-center gap-2"
                  >
                    <GearIcon
                      name={gearMap.get(h.gear_id)?.name ?? ""}
                      iconKind={gearMap.get(h.gear_id)?.icon_kind}
                      className="size-4 text-muted-foreground"
                    />
                    {gearMap.get(h.gear_id)?.name ?? `Gear #${h.gear_id}`}
                  </Link>
                  {h.moved_by && (
                    <div className="text-xs text-muted-foreground mt-1">
                      by {h.moved_by}
                    </div>
                  )}
                  {h.note && (
                    <div className="text-sm text-muted-foreground mt-2 italic">
                      "{h.note}"
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  disabled={loading}
                >
                  {loading ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
