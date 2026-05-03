import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type Brief,
  type Segment,
  type Shot,
  type ShotPriority,
  type SegmentRole,
  makeId,
  priorityClasses,
  priorityLabel,
  roleShort,
} from "@/lib/shot-list";
import { PHOTOGRAPHER_TIERS } from "@/lib/photographers";

interface ShotListEditorProps {
  brief: Brief;
  onChange: (brief: Brief) => void;
}

const ROLE_OPTIONS: { value: SegmentRole; label: string }[] = [
  { value: "all", label: "All" },
  ...PHOTOGRAPHER_TIERS.map((t) => ({ value: t.value as SegmentRole, label: t.short })),
];

const PRIORITY_CYCLE: ShotPriority[] = ["should", "must", "nice"];

export function ShotListEditor({ brief, onChange }: ShotListEditorProps) {
  function setMeta<K extends keyof Brief>(key: K, value: Brief[K]) {
    onChange({ ...brief, [key]: value });
  }

  function addSegment(title = "New segment") {
    const seg: Segment = {
      id: makeId(),
      title,
      assigned_roles: ["all"],
      shots: [],
    };
    onChange({ ...brief, segments: [...brief.segments, seg] });
  }

  function updateSegment(id: string, patch: Partial<Segment>) {
    onChange({
      ...brief,
      segments: brief.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  function removeSegment(id: string) {
    onChange({ ...brief, segments: brief.segments.filter((s) => s.id !== id) });
  }

  function moveSegment(id: string, dir: -1 | 1) {
    const idx = brief.segments.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= brief.segments.length) return;
    const arr = [...brief.segments];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    onChange({ ...brief, segments: arr });
  }

  return (
    <div className="space-y-5">
      {/* Top metadata */}
      <div className="border rounded-lg p-4 bg-card/50 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Call sheet
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="call-time" className="text-xs">Call time</Label>
            <Input
              id="call-time"
              value={brief.call_time ?? ""}
              onChange={(e) => setMeta("call_time", e.target.value)}
              placeholder="e.g. 9:00 AM"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="wrap-time" className="text-xs">Wrap</Label>
            <Input
              id="wrap-time"
              value={brief.wrap_time ?? ""}
              onChange={(e) => setMeta("wrap_time", e.target.value)}
              placeholder="e.g. 12:30 PM"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="door-code" className="text-xs">Door code</Label>
            <Input
              id="door-code"
              value={brief.door_code ?? ""}
              onChange={(e) => setMeta("door_code", e.target.value)}
              placeholder="e.g. 1234#"
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="arrival" className="text-xs">Arrival</Label>
          <Textarea
            id="arrival"
            value={brief.arrival_notes ?? ""}
            onChange={(e) => setMeta("arrival_notes", e.target.value)}
            placeholder="Where to park, where to enter, who to find."
            rows={2}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="details" className="text-xs">Details</Label>
          <Textarea
            id="details"
            value={brief.details_notes ?? ""}
            onChange={(e) => setMeta("details_notes", e.target.value)}
            placeholder="Dress code, posture, framing reminders."
            rows={2}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="gear" className="text-xs">Gear</Label>
          <Textarea
            id="gear"
            value={brief.gear_notes ?? ""}
            onChange={(e) => setMeta("gear_notes", e.target.value)}
            placeholder="Cameras, lenses, batteries."
            rows={2}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="editing" className="text-xs">Editing + Uploading</Label>
          <Textarea
            id="editing"
            value={brief.editing_notes ?? ""}
            onChange={(e) => setMeta("editing_notes", e.target.value)}
            placeholder="Where to upload, export specs, deadlines."
            rows={2}
            className="mt-1"
          />
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Segments
          </h3>
          <Button type="button" size="sm" variant="outline" onClick={() => addSegment()}>
            <Plus className="size-4" /> Add segment
          </Button>
        </div>

        {brief.segments.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
            No segments yet. Add a segment to get started.
          </div>
        ) : (
          brief.segments.map((seg, idx) => (
            <SegmentCard
              key={seg.id}
              segment={seg}
              isFirst={idx === 0}
              isLast={idx === brief.segments.length - 1}
              onUpdate={(patch) => updateSegment(seg.id, patch)}
              onRemove={() => removeSegment(seg.id)}
              onMove={(dir) => moveSegment(seg.id, dir)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SegmentCard({
  segment,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
}: {
  segment: Segment;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<Segment>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  function toggleRole(role: SegmentRole) {
    const has = segment.assigned_roles.includes(role);
    let next = has
      ? segment.assigned_roles.filter((r) => r !== role)
      : [...segment.assigned_roles, role];
    if (role === "all" && !has) next = ["all"];
    else if (role !== "all" && !has) next = next.filter((r) => r !== "all");
    if (next.length === 0) next = ["all"];
    onUpdate({ assigned_roles: next });
  }

  function addShot() {
    onUpdate({
      shots: [...segment.shots, { id: makeId(), text: "", priority: "should" }],
    });
  }

  function updateShot(id: string, patch: Partial<Shot>) {
    onUpdate({
      shots: segment.shots.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  function removeShot(id: string) {
    onUpdate({ shots: segment.shots.filter((s) => s.id !== id) });
  }

  function moveShot(id: string, dir: -1 | 1) {
    const idx = segment.shots.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= segment.shots.length) return;
    const arr = [...segment.shots];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    onUpdate({ shots: arr });
  }

  function cyclePriority(s: Shot) {
    const idx = PRIORITY_CYCLE.indexOf(s.priority);
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
    updateShot(s.id, { priority: next });
  }

  return (
    <div className="border rounded-lg bg-card/50 overflow-hidden">
      <div className="flex items-start gap-2 p-3 border-b bg-muted/20">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mt-1 text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        <div className="flex-1 min-w-0 space-y-2">
          <Input
            value={segment.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Segment title (e.g. Worship, Talk)"
            className="font-semibold"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={segment.location ?? ""}
              onChange={(e) => onUpdate({ location: e.target.value })}
              placeholder="Location (e.g. AUD)"
              className="h-8 text-xs"
            />
            <Input
              value={segment.time ?? ""}
              onChange={(e) => onUpdate({ time: e.target.value })}
              placeholder="Time (e.g. 9:30a)"
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {ROLE_OPTIONS.map((r) => {
              const active = segment.assigned_roles.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => toggleRole(r.value)}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted text-muted-foreground border-border"
                  )}
                >
                  {roleShort(r.value)}
                </button>
              );
            })}
          </div>
          <Input
            value={segment.focus ?? ""}
            onChange={(e) => onUpdate({ focus: e.target.value })}
            placeholder="Focus line (italic guidance, e.g. focus on smiling faces)"
            className="h-8 text-xs italic"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={isFirst}
            onClick={() => onMove(-1)}
            aria-label="Move segment up"
          >
            ↑
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={isLast}
            onClick={() => onMove(1)}
            aria-label="Move segment down"
          >
            ↓
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove segment"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2">
          {segment.shots.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-2 py-1">
              No shots yet — add the first one below.
            </p>
          ) : (
            segment.shots.map((shot, i) => (
              <div key={shot.id} className="flex items-start gap-2">
                <div className="flex flex-col text-muted-foreground">
                  <button
                    type="button"
                    className="hover:text-foreground disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => moveShot(shot.id, -1)}
                    aria-label="Move shot up"
                  >
                    <GripVertical className="size-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => cyclePriority(shot)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap mt-1",
                    priorityClasses(shot.priority)
                  )}
                  title="Click to cycle priority"
                >
                  {priorityLabel(shot.priority)}
                </button>
                <Textarea
                  value={shot.text}
                  onChange={(e) => updateShot(shot.id, { text: e.target.value })}
                  placeholder="Describe the shot…"
                  rows={1}
                  className="min-h-[36px] text-sm resize-none flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={() => removeShot(shot.id)}
                  aria-label="Remove shot"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
          <Button type="button" size="sm" variant="ghost" onClick={addShot}>
            <Plus className="size-4" /> Add shot
          </Button>
        </div>
      )}
    </div>
  );
}
