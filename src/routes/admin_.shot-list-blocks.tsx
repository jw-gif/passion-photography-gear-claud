import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { supabase } from "@/integrations/supabase/client";
import {
  type LocationBlockRow,
  type SegmentBlockRow,
  type TemplateRow,
  fetchLocationBlocks,
  fetchSegmentBlocks,
  fetchTemplates,
} from "@/lib/shot-list-blocks";
import type { ShotPriority } from "@/lib/shot-list";
import { PHOTOGRAPHER_TIERS } from "@/lib/photographers";

export const Route = createFileRoute("/admin_/shot-list-blocks")({
  head: () => ({
    meta: [{ title: "Manage Shot List Blocks · Passion Photography Hub" }],
  }),
  component: BlocksRoute,
});

function BlocksRoute() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <BlocksPage onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function BlocksPage({ onLogout }: { onLogout: () => void }) {
  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Manage Blocks" subtitle="Shot list bank" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manage Blocks &amp; Templates</h1>
            <p className="text-sm text-muted-foreground">
              Edit the building blocks the generator stitches together. Changes apply immediately.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/shot-list-generator">
              <ArrowLeft className="size-4" /> Back to generator
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <TemplatesPanel />
          </TabsContent>
          <TabsContent value="locations" className="mt-4">
            <LocationsPanel />
          </TabsContent>
          <TabsContent value="segments" className="mt-4">
            <SegmentsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

// ============================================================================
// LOCATIONS
// ============================================================================

function LocationsPanel() {
  const [rows, setRows] = useState<LocationBlockRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      setRows(await fetchLocationBlocks());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load locations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function add() {
    const key = prompt("Short key for this location (e.g. '515', 'Cumberland')");
    if (!key) return;
    const { error } = await supabase
      .from("shot_list_location_blocks")
      .insert({ key, label: key, sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 10 });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Location added");
    reload();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-3">
      <Button size="sm" onClick={add}>
        <Plus className="size-4" /> Add location
      </Button>
      {rows.map((row) => (
        <LocationCard key={row.id} row={row} onSaved={reload} onDeleted={reload} />
      ))}
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No locations yet.</p>
      )}
    </div>
  );
}

function LocationCard({
  row,
  onSaved,
  onDeleted,
}: {
  row: LocationBlockRow;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState(row);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(row);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("shot_list_location_blocks")
      .update({
        key: draft.key,
        label: draft.label,
        alias: draft.alias,
        address: draft.address,
        arrival: draft.arrival,
        editing_space: draft.editing_space,
        sort_order: draft.sort_order,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    onSaved();
  }

  async function remove() {
    if (!confirm(`Delete location "${row.label}"?`)) return;
    const { error } = await supabase
      .from("shot_list_location_blocks")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    onDeleted();
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Key</Label>
          <Input value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} className="mt-1 h-8 text-sm font-mono" />
        </div>
        <div>
          <Label className="text-xs">Label</Label>
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Alias (e.g. CBL)</Label>
          <Input value={draft.alias ?? ""} onChange={(e) => setDraft({ ...draft, alias: e.target.value || null })} className="mt-1 h-8 text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Address</Label>
        <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="mt-1 h-8 text-sm" />
      </div>
      <div>
        <Label className="text-xs">Arrival instructions</Label>
        <Textarea value={draft.arrival} onChange={(e) => setDraft({ ...draft, arrival: e.target.value })} rows={4} className="mt-1 text-sm" />
      </div>
      <div>
        <Label className="text-xs">Editing space directions</Label>
        <Textarea value={draft.editing_space} onChange={(e) => setDraft({ ...draft, editing_space: e.target.value })} rows={4} className="mt-1 text-sm" />
      </div>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}>
          <Trash2 className="size-4" /> Delete
        </Button>
        <Button size="sm" disabled={!dirty || saving} onClick={save}>
          <Save className="size-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// SEGMENTS
// ============================================================================

const PRIORITY_CYCLE: ShotPriority[] = ["should", "must", "nice"];
const PRIORITY_LABEL: Record<ShotPriority, string> = {
  must: "MUST",
  should: "Should",
  nice: "Nice",
};
const PRIORITY_CLASS: Record<ShotPriority, string> = {
  must: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  should: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  nice: "bg-muted text-muted-foreground border-border",
};

function SegmentsPanel() {
  const [rows, setRows] = useState<SegmentBlockRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      setRows(await fetchSegmentBlocks());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load segments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function add() {
    const key = prompt("Short key for this segment (e.g. 'baptisms')");
    if (!key) return;
    const title = prompt("Display title (e.g. 'Baptisms')") ?? key;
    const { error } = await supabase.from("shot_list_segment_blocks").insert({
      key,
      title,
      default_roles: ["all"],
      shots: [],
      sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 10,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Segment added");
    reload();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-3">
      <Button size="sm" onClick={add}>
        <Plus className="size-4" /> Add segment
      </Button>
      {rows.map((row) => (
        <SegmentCard key={row.id} row={row} onSaved={reload} onDeleted={reload} />
      ))}
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No segments yet.</p>
      )}
    </div>
  );
}

function SegmentCard({
  row,
  onSaved,
  onDeleted,
}: {
  row: SegmentBlockRow;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState(row);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(row);

  function toggleRole(role: string) {
    setDraft((d) => ({
      ...d,
      default_roles: d.default_roles.includes(role)
        ? d.default_roles.filter((r) => r !== role)
        : [...d.default_roles, role],
    }));
  }

  function addShot() {
    setDraft((d) => ({
      ...d,
      shots: [
        ...d.shots,
        { key: `shot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: "", priority: "should" },
      ],
    }));
  }

  function updateShot(idx: number, patch: Partial<SegmentBlockRow["shots"][number]>) {
    setDraft((d) => ({
      ...d,
      shots: d.shots.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }

  function removeShot(idx: number) {
    setDraft((d) => ({ ...d, shots: d.shots.filter((_, i) => i !== idx) }));
  }

  function cyclePriority(idx: number) {
    const current = draft.shots[idx].priority;
    const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(current) + 1) % PRIORITY_CYCLE.length];
    updateShot(idx, { priority: next });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("shot_list_segment_blocks")
      .update({
        key: draft.key,
        title: draft.title,
        default_location: draft.default_location,
        default_roles: draft.default_roles,
        focus: draft.focus,
        shots: draft.shots,
        sort_order: draft.sort_order,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    onSaved();
  }

  async function remove() {
    if (!confirm(`Delete segment "${row.title}"?`)) return;
    const { error } = await supabase
      .from("shot_list_segment_blocks")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    onDeleted();
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Key</Label>
          <Input value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} className="mt-1 h-8 text-sm font-mono" />
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Default location label</Label>
          <Input
            value={draft.default_location ?? ""}
            onChange={(e) => setDraft({ ...draft, default_location: e.target.value || null })}
            placeholder="e.g. AUD"
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Default roles</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          <ChipToggle active={draft.default_roles.includes("all")} onClick={() => toggleRole("all")}>
            All
          </ChipToggle>
          {PHOTOGRAPHER_TIERS.map((t) => (
            <ChipToggle key={t.value} active={draft.default_roles.includes(t.value)} onClick={() => toggleRole(t.value)}>
              {t.short}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Focus / one-liner</Label>
        <Input
          value={draft.focus ?? ""}
          onChange={(e) => setDraft({ ...draft, focus: e.target.value || null })}
          placeholder="e.g. Get the speaker mid-laugh and mid-point."
          className="mt-1 h-8 text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Shots</Label>
          <Button size="sm" variant="ghost" onClick={addShot}>
            <Plus className="size-4" /> Add shot
          </Button>
        </div>
        <div className="space-y-2">
          {draft.shots.map((shot, idx) => (
            <div key={shot.key} className="flex gap-2 items-start">
              <button
                type="button"
                onClick={() => cyclePriority(idx)}
                className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap mt-0.5 min-w-[58px]",
                  PRIORITY_CLASS[shot.priority],
                )}
              >
                {PRIORITY_LABEL[shot.priority]}
              </button>
              <Input
                value={shot.text}
                onChange={(e) => updateShot(idx, { text: e.target.value })}
                placeholder="Shot description"
                className="h-8 text-sm flex-1"
              />
              <Button size="icon" variant="ghost" onClick={() => removeShot(idx)} className="h-8 w-8">
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {draft.shots.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No shots yet — add one above.</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}>
          <Trash2 className="size-4" /> Delete
        </Button>
        <Button size="sm" disabled={!dirty || saving} onClick={save}>
          <Save className="size-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// TEMPLATES
// ============================================================================

function TemplatesPanel() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [locations, setLocations] = useState<LocationBlockRow[]>([]);
  const [segments, setSegments] = useState<SegmentBlockRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const [tpl, loc, seg] = await Promise.all([
        fetchTemplates(),
        fetchLocationBlocks(),
        fetchSegmentBlocks(),
      ]);
      setRows(tpl);
      setLocations(loc);
      setSegments(seg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function add() {
    const name = prompt("Template name (e.g. 'Sunday 515', 'Baptism Sunday')");
    if (!name) return;
    const { error } = await supabase.from("shot_list_templates").insert({
      name,
      roles: ["point", "door_holder"],
      segment_keys: [],
      sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 10,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Template added");
    reload();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-3">
      <Button size="sm" onClick={add}>
        <Plus className="size-4" /> Add template
      </Button>
      {rows.map((row) => (
        <TemplateCard key={row.id} row={row} locations={locations} segments={segments} onSaved={reload} onDeleted={reload} />
      ))}
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No templates yet.</p>
      )}
    </div>
  );
}

function TemplateCard({
  row,
  locations,
  segments,
  onSaved,
  onDeleted,
}: {
  row: TemplateRow;
  locations: LocationBlockRow[];
  segments: SegmentBlockRow[];
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState(row);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(row);

  function toggleRole(role: string) {
    setDraft((d) => ({
      ...d,
      roles: d.roles.includes(role) ? d.roles.filter((r) => r !== role) : [...d.roles, role],
    }));
  }

  function toggleSegment(key: string) {
    setDraft((d) => ({
      ...d,
      segment_keys: d.segment_keys.includes(key)
        ? d.segment_keys.filter((k) => k !== key)
        : [...d.segment_keys, key],
    }));
  }

  function moveSegment(key: string, dir: -1 | 1) {
    setDraft((d) => {
      const idx = d.segment_keys.indexOf(key);
      if (idx < 0) return d;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= d.segment_keys.length) return d;
      const arr = [...d.segment_keys];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...d, segment_keys: arr };
    });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("shot_list_templates")
      .update({
        name: draft.name,
        description: draft.description,
        location_key: draft.location_key,
        segment_keys: draft.segment_keys,
        roles: draft.roles,
        call_time: draft.call_time,
        wrap_time: draft.wrap_time,
        sort_order: draft.sort_order,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    onSaved();
  }

  async function remove() {
    if (!confirm(`Delete template "${row.name}"?`)) return;
    const { error } = await supabase.from("shot_list_templates").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    onDeleted();
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Name</Label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Input
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Location</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          <ChipToggle active={!draft.location_key} onClick={() => setDraft({ ...draft, location_key: null })}>
            None
          </ChipToggle>
          {locations.map((l) => (
            <ChipToggle
              key={l.key}
              active={draft.location_key === l.key}
              onClick={() => setDraft({ ...draft, location_key: l.key })}
            >
              {l.label}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Default roles</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {PHOTOGRAPHER_TIERS.map((t) => (
            <ChipToggle key={t.value} active={draft.roles.includes(t.value)} onClick={() => toggleRole(t.value)}>
              {t.short}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Default call time</Label>
          <Input
            value={draft.call_time ?? ""}
            onChange={(e) => setDraft({ ...draft, call_time: e.target.value || null })}
            placeholder="8:00 AM"
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Default wrap</Label>
          <Input
            value={draft.wrap_time ?? ""}
            onChange={(e) => setDraft({ ...draft, wrap_time: e.target.value || null })}
            placeholder="12:30 PM"
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Segments (in order)</Label>
        <div className="space-y-1 mt-1">
          {draft.segment_keys.map((key, idx) => {
            const seg = segments.find((s) => s.key === key);
            return (
              <div key={key} className="flex items-center gap-1 text-xs bg-muted/40 rounded px-2 py-1">
                <span className="flex-1">
                  {seg?.title ?? key}{" "}
                  {!seg && <span className="text-destructive">(missing)</span>}
                </span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveSegment(key, -1)} disabled={idx === 0}>
                  ↑
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => moveSegment(key, 1)}
                  disabled={idx === draft.segment_keys.length - 1}
                >
                  ↓
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toggleSegment(key)}>
                  <X className="size-3" />
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Add segments:</p>
          <div className="flex flex-wrap gap-1">
            {segments
              .filter((s) => !draft.segment_keys.includes(s.key))
              .map((s) => (
                <ChipToggle key={s.key} active={false} onClick={() => toggleSegment(s.key)}>
                  + {s.title}
                </ChipToggle>
              ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}>
          <Trash2 className="size-4" /> Delete
        </Button>
        <Button size="sm" disabled={!dirty || saving} onClick={save}>
          <Save className="size-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// shared
// ============================================================================

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs px-2 py-1 rounded-full border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted text-foreground border-border",
      )}
    >
      {children}
    </button>
  );
}
