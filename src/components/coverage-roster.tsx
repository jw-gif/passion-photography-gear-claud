import { useEffect, useState } from "react";
import { Plus, Trash2, UserCheck, X } from "lucide-react";
import { format, parseISO } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PHOTOGRAPHER_TIERS,
  type PhotographerTier,
  tierLabel,
  tierBadgeClasses,
  formatBudget,
  parseBudgetInputToCents,
} from "@/lib/photographers";

interface OpeningRow {
  id: string;
  request_id: string;
  role: PhotographerTier;
  budget_cents: number | null;
  position: number;
  created_at: string;
}

interface AssignmentRow {
  id: string;
  opening_id: string;
  photographer_id: string;
  claimed_at: string;
  released_at: string | null;
}

interface PhotographerLite {
  id: string;
  name: string;
  tier: PhotographerTier;
}

interface CoverageRosterProps {
  requestId: string;
}

export function CoverageRoster({ requestId }: CoverageRosterProps) {
  const [openings, setOpenings] = useState<OpeningRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [photographers, setPhotographers] = useState<Record<string, PhotographerLite>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newRole, setNewRole] = useState<PhotographerTier>("point");
  const [newBudget, setNewBudget] = useState("");

  async function load() {
    setLoading(true);
    const [openingsRes, assignmentsRes] = await Promise.all([
      supabase
        .from("photo_request_openings")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true }),
      supabase
        .from("photo_request_assignments")
        .select("*")
        .eq("request_id", requestId)
        .is("released_at", null),
    ]);
    if (openingsRes.error) toast.error(openingsRes.error.message);
    if (assignmentsRes.error) toast.error(assignmentsRes.error.message);

    const ops = (openingsRes.data ?? []) as OpeningRow[];
    const asg = (assignmentsRes.data ?? []) as AssignmentRow[];
    setOpenings(ops);
    setAssignments(asg);

    const ids = Array.from(new Set(asg.map((a) => a.photographer_id)));
    if (ids.length > 0) {
      const { data: phs } = await supabase
        .from("photographers")
        .select("id, name, tier")
        .in("id", ids);
      const map: Record<string, PhotographerLite> = {};
      for (const p of (phs ?? []) as PhotographerLite[]) map[p.id] = p;
      setPhotographers(map);
    } else {
      setPhotographers({});
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  function nextPositionFor(role: PhotographerTier): number {
    const used = openings.filter((o) => o.role === role).map((o) => o.position);
    let n = 1;
    while (used.includes(n)) n += 1;
    return n;
  }

  async function addOpening() {
    const budget_cents = newRole === "point" ? parseBudgetInputToCents(newBudget) : null;
    if (newRole === "point" && newBudget.trim() && budget_cents === null) {
      toast.error("Enter a valid budget (e.g. 300 or 300.00)");
      return;
    }
    const position = nextPositionFor(newRole);
    const { error } = await supabase.from("photo_request_openings").insert({
      request_id: requestId,
      role: newRole,
      budget_cents,
      position,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Added ${tierLabel(newRole)} opening`);
    setAdding(false);
    setNewBudget("");
    setNewRole("point");
    await load();
  }

  async function updateBudget(opening: OpeningRow, raw: string) {
    if (opening.role !== "point") return;
    const cents = raw.trim() ? parseBudgetInputToCents(raw) : null;
    if (raw.trim() && cents === null) {
      toast.error("Invalid budget");
      return;
    }
    const { error } = await supabase
      .from("photo_request_openings")
      .update({ budget_cents: cents })
      .eq("id", opening.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Budget saved");
      await load();
    }
  }

  async function removeOpening(opening: OpeningRow) {
    const isAssigned = assignments.some((a) => a.opening_id === opening.id);
    const msg = isAssigned
      ? "This opening has been claimed by a photographer. Removing it will release them. Continue?"
      : "Remove this opening?";
    if (!confirm(msg)) return;
    const { error } = await supabase
      .from("photo_request_openings")
      .delete()
      .eq("id", opening.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Opening removed");
      await load();
    }
  }

  async function releaseAssignment(opening: OpeningRow) {
    const a = assignments.find((x) => x.opening_id === opening.id);
    if (!a) return;
    if (!confirm("Release this photographer from the spot? It will reappear on serving opportunities.")) return;
    const { error } = await supabase
      .from("photo_request_assignments")
      .update({ released_at: new Date().toISOString(), released_by: "Admin" })
      .eq("id", a.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Released");
      await load();
    }
  }

  // Roster summary
  const summary = PHOTOGRAPHER_TIERS.map((t) => {
    const ops = openings.filter((o) => o.role === t.value);
    if (ops.length === 0) return null;
    const filled = ops.filter((o) => assignments.some((a) => a.opening_id === o.id)).length;
    const open = ops.length - filled;
    const totalBudget = ops.reduce((sum, o) => sum + (o.budget_cents ?? 0), 0);
    return {
      tier: t.value,
      label: t.label,
      total: ops.length,
      filled,
      open,
      totalBudget: t.value === "point" ? totalBudget : 0,
    };
  }).filter(Boolean) as Array<{
    tier: PhotographerTier;
    label: string;
    total: number;
    filled: number;
    open: number;
    totalBudget: number;
  }>;

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading roster…</p>
      ) : (
        <>
          {summary.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {summary.map((s) => (
                <span
                  key={s.tier}
                  className={cn(
                    "px-2 py-1 rounded-md border",
                    tierBadgeClasses(s.tier)
                  )}
                >
                  {s.total} {s.label}
                  {s.tier === "point" && s.totalBudget > 0 && ` · ${formatBudget(s.totalBudget)}`}
                  {" · "}
                  {s.filled} filled, {s.open} open
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {openings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No openings yet. Add one to publish this shoot to serving opportunities.
              </p>
            )}
            {openings.map((o) => {
              const a = assignments.find((x) => x.opening_id === o.id);
              const photog = a ? photographers[a.photographer_id] : null;
              return (
                <div
                  key={o.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-md bg-card"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap",
                        tierBadgeClasses(o.role)
                      )}
                    >
                      {tierLabel(o.role)} #{o.position}
                    </span>
                    {o.role === "point" ? (
                      <BudgetEditor
                        initial={o.budget_cents}
                        onSave={(v) => updateBudget(o, v)}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">Unpaid coverage</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end">
                    {photog ? (
                      <div className="flex items-center gap-2 text-sm">
                        <UserCheck className="size-4 text-emerald-600" />
                        <div>
                          <div className="font-medium leading-tight">{photog.name}</div>
                          {a && (
                            <div className="text-xs text-muted-foreground">
                              Claimed {format(parseISO(a.claimed_at), "MMM d, h:mm a")}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => releaseAssignment(o)}
                          title="Release"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Open</span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOpening(o)}
                      className="text-destructive hover:text-destructive"
                      title="Remove opening"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {adding ? (
            <div className="flex flex-col sm:flex-row gap-2 p-3 border rounded-md bg-muted/30">
              <div className="flex-1">
                <Label className="text-xs">Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as PhotographerTier)}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHOTOGRAPHER_TIERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                        {t.value !== "point" && (
                          <span className="text-muted-foreground"> · unpaid</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newRole === "point" && (
                <div className="flex-1">
                  <Label className="text-xs">Budget (USD)</Label>
                  <Input
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="300"
                    className="mt-1 h-9"
                    inputMode="decimal"
                  />
                </div>
              )}
              <div className="flex items-end gap-2">
                <Button size="sm" onClick={addOpening}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAdding(false);
                    setNewBudget("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Add opening
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function BudgetEditor({
  initial,
  onSave,
}: {
  initial: number | null;
  onSave: (raw: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial != null ? (initial / 100).toString() : "");

  useEffect(() => {
    setValue(initial != null ? (initial / 100).toString() : "");
  }, [initial]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm font-medium hover:underline"
      >
        {initial != null ? `${formatBudget(initial)} · Paid` : "+ Set budget"}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm">$</span>
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(value);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-24 text-sm"
        inputMode="decimal"
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={() => {
          onSave(value);
          setEditing(false);
        }}
      >
        Save
      </Button>
    </div>
  );
}
