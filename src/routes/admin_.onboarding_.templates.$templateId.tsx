import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type TemplateChecklistItem,
  type TemplateRow,
  type TemplateTimelineItem,
  safeTemplateChecklist,
  safeTemplateTimeline,
} from "@/lib/onboarding";
import { SaveIndicator, useAutoSave } from "@/lib/use-auto-save";

export const Route = createFileRoute("/admin_/onboarding_/templates/$templateId")({
  head: () => ({ meta: [{ title: "Template · Staff Onboarding" }] }),
  component: PageWrapper,
});

function PageWrapper() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin requireAdmin>
      <Editor onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function Editor({ onLogout }: { onLogout: () => void }) {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const [tpl, setTpl] = useState<TemplateRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [checklist, setChecklist] = useState<TemplateChecklistItem[]>([]);
  const [timeline, setTimeline] = useState<TemplateTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .select("id, name, description, checklist, timeline, sort_order")
        .eq("id", templateId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Template not found");
        navigate({ to: "/admin/onboarding" });
        return;
      }
      const row: TemplateRow = {
        ...data,
        checklist: safeTemplateChecklist(data.checklist),
        timeline: safeTemplateTimeline(data.timeline),
      };
      setTpl(row);
      setName(row.name);
      setDescription(row.description ?? "");
      setChecklist(row.checklist);
      setTimeline(row.timeline);
      setLoading(false);
    })();
  }, [templateId, navigate]);

  const value = useMemo(
    () => ({ name, description, checklist, timeline }),
    [name, description, checklist, timeline],
  );

  const saveState = useAutoSave(value, async (v) => {
    const { error } = await supabase
      .from("onboarding_templates")
      .update({
        name: v.name,
        description: v.description.trim() || null,
        checklist: JSON.parse(JSON.stringify(v.checklist)),
        timeline: JSON.parse(JSON.stringify(v.timeline)),
      })
      .eq("id", templateId);
    if (error) throw error;
  });

  async function remove() {
    if (!tpl) return;
    if (!confirm(`Delete template "${tpl.name}"?`)) return;
    const { error } = await supabase.from("onboarding_templates").delete().eq("id", templateId);
    if (error) toast.error(error.message);
    else navigate({ to: "/admin/onboarding" });
  }

  if (loading || !tpl) {
    return (
      <main className="min-h-screen">
        <HubHeader onLogout={onLogout} title="Template" subtitle="Staff Onboarding" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-sm text-muted-foreground">
          Loading…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title={name || "Template"} subtitle="Staff Onboarding" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/onboarding">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            <Button
              variant="ghost"
              size="sm"
              onClick={remove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>

        <Card className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </Card>

        <Tabs defaultValue="checklist">
          <TabsList>
            <TabsTrigger value="checklist">Checklist ({checklist.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="checklist" className="mt-4">
            <ChecklistTemplateEditor items={checklist} onChange={setChecklist} />
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <TimelineTemplateEditor items={timeline} onChange={setTimeline} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

/* --------------------------- Checklist editor ---------------------- */

function ChecklistTemplateEditor({
  items,
  onChange,
}: {
  items: TemplateChecklistItem[];
  onChange: (next: TemplateChecklistItem[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [ids, setIds] = useState(() => items.map((_, i) => `c-${i}-${Math.random()}`));
  if (ids.length !== items.length) {
    setIds(items.map((_, i) => ids[i] ?? `c-${i}-${Math.random()}`));
  }

  function update(i: number, patch: Partial<TemplateChecklistItem>) {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    const next = ids.slice();
    next.splice(i, 1);
    setIds(next);
    onChange(items.filter((_, j) => j !== i));
  }
  function add() {
    setIds([...ids, `c-${items.length}-${Math.random()}`]);
    onChange([...items, { section: "General", label: "", owner: "" }]);
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setIds(arrayMove(ids, oldIndex, newIndex));
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((it, i) => (
            <ChecklistRow
              key={ids[i]}
              id={ids[i]}
              item={it}
              onChange={(patch) => update(i, patch)}
              onRemove={() => remove(i)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" /> Add task
      </Button>
    </div>
  );
}

function ChecklistRow({
  id,
  item,
  onChange,
  onRemove,
}: {
  id: string;
  item: TemplateChecklistItem;
  onChange: (patch: Partial<TemplateChecklistItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-3">
        <div className="grid grid-cols-[auto_140px_1fr_140px_auto] gap-2 items-center">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab"
            {...attributes}
            {...listeners}
            aria-label="Drag"
          >
            <GripVertical className="size-4" />
          </button>
          <Input
            placeholder="Section"
            value={item.section}
            onChange={(e) => onChange({ section: e.target.value })}
            className="text-xs"
          />
          <Input
            placeholder="Task label"
            value={item.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
          <Input
            placeholder="Owner (optional)"
            value={item.owner ?? ""}
            onChange={(e) => onChange({ owner: e.target.value })}
            className="text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* --------------------------- Timeline editor ----------------------- */

function TimelineTemplateEditor({
  items,
  onChange,
}: {
  items: TemplateTimelineItem[];
  onChange: (next: TemplateTimelineItem[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [ids, setIds] = useState(() => items.map((_, i) => `t-${i}-${Math.random()}`));
  if (ids.length !== items.length) {
    setIds(items.map((_, i) => ids[i] ?? `t-${i}-${Math.random()}`));
  }

  function update(i: number, patch: Partial<TemplateTimelineItem>) {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    const next = ids.slice();
    next.splice(i, 1);
    setIds(next);
    onChange(items.filter((_, j) => j !== i));
  }
  function add() {
    setIds([...ids, `t-${items.length}-${Math.random()}`]);
    const lastOffset = items.length ? items[items.length - 1].day_offset + 1 : 0;
    onChange([
      ...items,
      { day_offset: lastOffset, label: `Day ${lastOffset + 1}`, title: "", description: "" },
    ]);
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setIds(arrayMove(ids, oldIndex, newIndex));
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((it, i) => (
            <TimelineRow
              key={ids[i]}
              id={ids[i]}
              item={it}
              onChange={(patch) => update(i, patch)}
              onRemove={() => remove(i)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" /> Add milestone
      </Button>
    </div>
  );
}

function TimelineRow({
  id,
  item,
  onChange,
  onRemove,
}: {
  id: string;
  item: TemplateTimelineItem;
  onChange: (patch: Partial<TemplateTimelineItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-3">
        <div className="grid grid-cols-[auto_80px_120px_1fr_auto] gap-2 items-start">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab pt-2"
            {...attributes}
            {...listeners}
            aria-label="Drag"
          >
            <GripVertical className="size-4" />
          </button>
          <div>
            <Label className="text-[10px] uppercase">Day #</Label>
            <Input
              type="number"
              value={item.day_offset}
              onChange={(e) => onChange({ day_offset: Number.parseInt(e.target.value, 10) || 0 })}
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase">Label</Label>
            <Input value={item.label} onChange={(e) => onChange({ label: e.target.value })} />
          </div>
          <div>
            <Label className="text-[10px] uppercase">Title</Label>
            <Input value={item.title} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive mt-5"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        <div className="mt-2">
          <Label className="text-[10px] uppercase">Description</Label>
          <Textarea
            rows={2}
            value={item.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
      </Card>
    </div>
  );
}

/* --------------------------- Standalone helpers -------------------- */

export function NewTemplateDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("onboarding_templates")
      .insert({ name: name.trim() })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create");
      return;
    }
    toast.success("Template created");
    setOpen(false);
    setName("");
    onCreated(data.id);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" /> New template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
        </DialogHeader>
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Designer onboarding"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
