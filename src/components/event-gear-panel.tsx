import { useEffect, useMemo, useState } from "react";
import { Check, Package, Search, Send, X } from "lucide-react";
import { format, parseISO } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GearIcon } from "@/lib/gear-icons";
import { LOCATIONS, locationLabel } from "@/lib/locations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GearRow {
  id: string;
  name: string;
  icon_kind: string | null;
}

interface LinkedRequest {
  id: string;
  requestor_name: string;
  location: string;
  needed_date: string;
  notes: string | null;
  status: "pending" | "approved" | "denied";
  created_at: string;
}

interface LinkedItem {
  id: string;
  request_id: string;
  gear_id: string;
}

interface EventGearPanelProps {
  photoRequestId: string;
  defaultRequestor: string;
  defaultLocation: string | null;
  defaultDate: string | null;
  defaultNotes?: string | null;
  canDelete?: boolean;
}

const STATUS_BADGE: Record<LinkedRequest["status"], string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  denied: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

function pickClosestLocation(raw: string | null): string {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  for (const loc of LOCATIONS) {
    if (lower.includes(loc.toLowerCase())) return loc;
  }
  return "";
}

export function EventGearPanel({
  photoRequestId,
  defaultRequestor,
  defaultLocation,
  defaultDate,
  defaultNotes,
  canDelete = true,
}: EventGearPanelProps) {
  const [gear, setGear] = useState<GearRow[]>([]);
  const [linked, setLinked] = useState<LinkedRequest[]>([]);
  const [items, setItems] = useState<LinkedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [requestor, setRequestor] = useState(defaultRequestor);
  const [location, setLocation] = useState<string>(pickClosestLocation(defaultLocation));
  const [neededDate, setNeededDate] = useState<string>(defaultDate ?? "");
  const [notes, setNotes] = useState<string>(defaultNotes ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const [gearRes, reqRes] = await Promise.all([
      supabase
        .from("gear")
        .select("id, name, icon_kind")
        .eq("status", "active")
        .eq("requestable", true)
        .order("name", { ascending: true }),
      supabase
        .from("gear_requests")
        .select("*")
        .eq("photo_request_id", photoRequestId)
        .order("created_at", { ascending: false }),
    ]);
    setGear((gearRes.data ?? []) as GearRow[]);
    const reqs = (reqRes.data ?? []) as LinkedRequest[];
    setLinked(reqs);

    if (reqs.length > 0) {
      const { data: itemRows } = await supabase
        .from("gear_request_items")
        .select("*")
        .in(
          "request_id",
          reqs.map((r) => r.id),
        );
      setItems((itemRows ?? []) as LinkedItem[]);
    } else {
      setItems([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoRequestId]);

  // Reset form defaults when opening
  useEffect(() => {
    if (adding) {
      setRequestor(defaultRequestor);
      setLocation(pickClosestLocation(defaultLocation));
      setNeededDate(defaultDate ?? "");
      setNotes(defaultNotes ?? "");
      setSelected(new Set());
      setQuery("");
    }
  }, [adding, defaultRequestor, defaultLocation, defaultDate, defaultNotes]);

  const filteredGear = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gear;
    return gear.filter((g) => g.name.toLowerCase().includes(q));
  }, [gear, query]);

  const gearById = useMemo(() => {
    const m: Record<string, GearRow> = {};
    for (const g of gear) m[g.id] = g;
    return m;
  }, [gear]);

  function toggleGear(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!requestor.trim()) {
      toast.error("Requestor name is required");
      return;
    }
    if (!location) {
      toast.error("Location is required");
      return;
    }
    if (!neededDate) {
      toast.error("Needed date is required");
      return;
    }
    if (selected.size === 0) {
      toast.error("Pick at least one gear item");
      return;
    }
    setSubmitting(true);
    const { data: req, error: reqErr } = await supabase
      .from("gear_requests")
      .insert({
        requestor_name: requestor.trim(),
        location,
        needed_date: neededDate,
        notes: notes.trim() || null,
        photo_request_id: photoRequestId,
      })
      .select("id")
      .single();
    if (reqErr || !req) {
      toast.error(`Couldn't create gear request: ${reqErr?.message}`);
      setSubmitting(false);
      return;
    }
    const itemRows = Array.from(selected).map((gid) => ({
      request_id: req.id,
      gear_id: gid,
    }));
    const { error: itemErr } = await supabase.from("gear_request_items").insert(itemRows);
    if (itemErr) toast.error(`Items failed: ${itemErr.message}`);
    else toast.success("Gear request created");
    setSubmitting(false);
    setAdding(false);
    await load();
  }

  async function removeRequest(id: string) {
    if (!confirm("Delete this gear request?")) return;
    const { error } = await supabase.from("gear_requests").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      await load();
    }
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading gear…</p>
      ) : (
        <>
          {linked.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground">
              No gear requested yet for this event.
            </p>
          )}

          {linked.map((r) => {
            const reqItems = items.filter((i) => i.request_id === r.id);
            return (
              <div
                key={r.id}
                className="p-3 border rounded-md bg-card space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full border capitalize",
                          STATUS_BADGE[r.status],
                        )}
                      >
                        {r.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {locationLabel(r.location)} · {format(parseISO(r.needed_date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="text-sm mt-1">
                      Requested by <span className="font-medium">{r.requestor_name}</span>
                    </div>
                    {r.notes && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {r.notes}
                      </p>
                    )}
                  </div>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRequest(r.id)}
                      className="text-destructive hover:text-destructive shrink-0"
                      title="Delete request"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                {reqItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {reqItems.map((it) => {
                      const g = gearById[it.gear_id];
                      return (
                        <span
                          key={it.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted"
                        >
                          {g ? (
                            <GearIcon name={g.name} iconKind={g.icon_kind} className="size-3.5" />
                          ) : (
                            <Package className="size-3.5" />
                          )}
                          {g?.name ?? `Gear #${it.gear_id}`}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {adding ? (
            <div className="p-3 border rounded-md bg-muted/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Requestor</label>
                  <Input
                    value={requestor}
                    onChange={(e) => setRequestor(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Location</label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {locationLabel(loc)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Needed date</label>
                  <Input
                    type="date"
                    value={neededDate}
                    onChange={(e) => setNeededDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium">
                    Gear {selected.size > 0 && (
                      <span className="text-muted-foreground">· {selected.size} selected</span>
                    )}
                  </label>
                </div>
                <div className="relative mb-2">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search gear…"
                    className="pl-9 h-9"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto border rounded-md bg-background">
                  {filteredGear.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">
                      No gear matches.
                    </p>
                  ) : (
                    filteredGear.map((g) => {
                      const checked = selected.has(g.id);
                      return (
                        <label
                          key={g.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm border-b last:border-b-0",
                            checked ? "bg-primary/5" : "hover:bg-muted/60",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleGear(g.id)}
                          />
                          <GearIcon
                            name={g.name}
                            iconKind={g.icon_kind}
                            className="size-4 text-foreground/70"
                          />
                          <span className="flex-1">{g.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-sm"
                  placeholder="Anything the gear team should know?"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={submit} disabled={submitting}>
                  <Send className="size-4" />
                  {submitting ? "Submitting…" : "Submit gear request"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAdding(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Package className="size-4" /> Request gear for this event
            </Button>
          )}
        </>
      )}
    </div>
  );
}
