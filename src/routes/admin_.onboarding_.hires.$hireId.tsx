import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, GripVertical, Plus, Sparkles, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type HireRow,
  type TimelineItemRow,
  type ChecklistItemRow,
  type TemplateRow,
  classifyMilestone,
  dayOffsetToDate,
  dateToDayOffset,
  checklistProgress,
  safeTemplateChecklist,
  safeTemplateTimeline,
} from "@/lib/onboarding";
import { SaveIndicator, useAutoSave } from "@/lib/use-auto-save";

export const Route = createFileRoute("/admin_/onboarding_/hires/$hireId")({
  head: () => ({ meta: [{ title: "Hire · Staff Onboarding" }] }),
  component: PageWrapper,
});

function PageWrapper() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin requireAdmin>
      <HireEditor onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function HireEditor({ onLogout }: { onLogout: () => void }) {
  const { hireId } = Route.useParams();
  const navigate = useNavigate();

  const [hire, setHire] = useState<HireRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineItemRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: h }, { data: t }, { data: c }] = await Promise.all([
      supabase
        .from("onboarding_hires")
        .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
        .eq("id", hireId)
        .maybeSingle(),
      supabase
        .from("onboarding_hire_timeline")
        .select("id, hire_id, day_offset, label, title, description, sort_order")
        .eq("hire_id", hireId)
        .order("day_offset")
        .order("sort_order"),
      supabase
        .from("onboarding_hire_checklist")
        .select("id, hire_id, section, label, owner, completed, completed_at, sort_order, day_offset")
        .eq("hire_id", hireId)
        .order("sort_order"),
    ]);
    if (!h) {
      toast.error("Hire not found");
      navigate({ to: "/admin/onboarding" });
      return;
    }
    setHire(h as HireRow);
    setTimeline((t ?? []) as TimelineItemRow[]);
    setChecklist((c ?? []) as ChecklistItemRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [hireId]);

  if (loading || !hire) {
    return (
      <main className="min-h-screen">
        <HubHeader onLogout={onLogout} title="Hire" subtitle="Staff Onboarding" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="h-8 w-32 rounded bg-muted animate-pulse" />
          <div className="h-24 w-full rounded-xl bg-muted animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="h-64 w-full rounded-xl bg-muted animate-pulse" />
        </div>
      </main>
    );
  }

  const progress = checklistProgress(checklist);

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title={hire.name} subtitle="Staff Onboarding" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/onboarding">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <ApplyTemplateButton hireId={hire.id} onApplied={load} />
            <Button asChild variant="outline" size="sm">
              <a
                href={`/onboarding?previewHire=${hire.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" /> Open hire view
              </a>
            </Button>
          </div>
        </div>

        <HireMetaCard hire={hire} onChanged={load} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Start date</div>
            <div className="font-semibold">
              {format(new Date(`${hire.start_date}T00:00:00`), "EEE, MMM d, yyyy")}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Checklist progress</div>
            <div className="font-semibold">
              {progress.done}/{progress.total} ({progress.pct}%)
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Login linked</div>
            <div className="font-semibold">{hire.user_id ? "Yes" : "Not yet"}</div>
            {!hire.user_id && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Linked when they sign in with {hire.email}.
              </div>
            )}
          </Card>
        </div>

        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">First month timeline</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4">
            <TimelinePanel
              hire={hire}
              items={timeline}
              onChanged={load}
              setItems={setTimeline}
            />
          </TabsContent>
          <TabsContent value="checklist" className="mt-4">
            <ChecklistPanel
              hire={hire}
              items={checklist}
              setItems={setChecklist}
              onChanged={load}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Hire meta with auto-save                                           */
/* ------------------------------------------------------------------ */

function HireMetaCard({ hire, onChanged }: { hire: HireRow; onChanged: () => void }) {
  const [name, setName] = useState(hire.name);
  const [email, setEmail] = useState(hire.email);
  const [roleLabel, setRoleLabel] = useState(hire.role_label ?? "");
  const [startDate, setStartDate] = useState(hire.start_date);
  const [coordinator, setCoordinator] = useState(hire.coordinator_name ?? "");
  // Start collapsed if hire already has a name and email filled in
  const [expanded, setExpanded] = useState(!hire.name || !hire.email);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const value = useMemo(
    () => ({ name, email, roleLabel, startDate, coordinator }),
    [name, email, roleLabel, startDate, coordinator],
  );

  const saveState = useAutoSave(value, async (v) => {
    const { error } = await supabase
      .from("onboarding_hires")
      .update({
        name: v.name,
        email: v.email.toLowerCase(),
        role_label: v.roleLabel.trim() || null,
        start_date: v.startDate,
        coordinator_name: v.coordinator.trim() || null,
      })
      .eq("id", hire.id);
    if (error) throw error;
  });

  async function remove() {
    const { error } = await supabase.from("onboarding_hires").delete().eq("id", hire.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      window.location.href = "/admin/onboarding";
    }
  }

  if (!expanded) {
    return (
      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-medium">{name}</span>
          <span className="text-muted-foreground"> · {email}</span>
          {roleLabel && <span className="text-muted-foreground"> · {roleLabel}</span>}
          {coordinator && (
            <span className="text-muted-foreground"> · Coord: {coordinator}</span>
          )}
        </div>
        <SaveIndicator state={saveState} />
        <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
          <ChevronDown className="size-4" /> Edit details
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Role / track</Label>
          <Input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Coordinator</Label>
          <Input value={coordinator} onChange={(e) => setCoordinator(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" /> Delete hire
        </Button>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
            <ChevronUp className="size-4" /> Collapse
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${hire.name}?`}
        description="This permanently removes their timeline and checklist. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline                                                           */
/* ------------------------------------------------------------------ */

function TimelinePanel({
  hire,
  items,
  setItems,
  onChanged,
}: {
  hire: HireRow;
  items: TimelineItemRow[];
  setItems: (next: TimelineItemRow[]) => void;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function add() {
    setAdding(true);
    const nextOffset =
      items.length === 0 ? 0 : (items[items.length - 1]?.day_offset ?? 0) + 1;
    const { error } = await supabase.from("onboarding_hire_timeline").insert({
      hire_id: hire.id,
      day_offset: nextOffset,
      label: `Day ${nextOffset + 1}`,
      title: "New milestone",
      description: "",
      sort_order: items.length,
    });
    setAdding(false);
    if (error) toast.error(error.message);
    else onChanged();
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({
      ...it,
      sort_order: idx,
    }));
    setItems(next);
    await Promise.all(
      next.map((it) =>
        supabase
          .from("onboarding_hire_timeline")
          .update({ sort_order: it.sort_order })
          .eq("id", it.id),
      ),
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground mb-3">No timeline items yet.</div>
        <Button size="sm" onClick={add} disabled={adding}>
          <Plus className="size-4" /> Add first milestone
        </Button>
      </Card>
    );
  }

  // Group by week (week 1 = days 0-6, week 2 = 7-13, etc.)
  const groups = new Map<number, TimelineItemRow[]>();
  for (const it of items) {
    const week = Math.max(0, Math.floor(it.day_offset / 7));
    const arr = groups.get(week) ?? [];
    arr.push(it);
    groups.set(week, arr);
  }
  const weeks = Array.from(groups.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Each item is pinned to a number of days after the start date. The hire's view shows past
        items as complete and highlights today. Drag to reorder.
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {weeks.map((w) => (
            <div key={w} className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Week {w + 1}
              </div>
              {(groups.get(w) ?? []).map((item) => (
                <SortableTimelineRow
                  key={item.id}
                  hire={hire}
                  item={item}
                  onChanged={onChanged}
                />
              ))}
            </div>
          ))}
        </SortableContext>
      </DndContext>
      <Button variant="outline" size="sm" onClick={add} disabled={adding}>
        <Plus className="size-4" /> Add milestone
      </Button>
    </div>
  );
}

function SortableTimelineRow({
  hire,
  item,
  onChanged,
}: {
  hire: HireRow;
  item: TimelineItemRow;
  onChanged: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <TimelineItemEditor
        hire={hire}
        item={item}
        onChanged={onChanged}
        dragHandle={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

function TimelineItemEditor({
  hire,
  item,
  onChanged,
  dragHandle,
}: {
  hire: HireRow;
  item: TimelineItemRow;
  onChanged: () => void;
  dragHandle?: React.ReactNode;
}) {
  const [dayOffset, setDayOffset] = useState(item.day_offset);
  const [label, setLabel] = useState(item.label);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");

  const date = dayOffsetToDate(hire.start_date, dayOffset);
  const status = classifyMilestone(hire.start_date, dayOffset);
  const dateValue = format(date, "yyyy-MM-dd");

  const value = useMemo(
    () => ({ dayOffset, label, title, description }),
    [dayOffset, label, title, description],
  );

  const saveState = useAutoSave(value, async (v) => {
    const { error } = await supabase
      .from("onboarding_hire_timeline")
      .update({
        day_offset: v.dayOffset,
        label: v.label,
        title: v.title,
        description: v.description.trim() || null,
      })
      .eq("id", item.id);
    if (error) throw error;
  });

  async function remove() {
    const { error } = await supabase.from("onboarding_hire_timeline").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else onChanged();
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-2">
        {dragHandle && <div className="pt-2">{dragHandle}</div>}
        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-[150px_100px_140px_1fr] gap-2">
            <div>
              <Label className="text-[10px] uppercase">Date</Label>
              <Input
                type="date"
                value={dateValue}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setDayOffset(dateToDayOffset(hire.start_date, e.target.value));
                }}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Day #</Label>
              <Input
                type="number"
                value={dayOffset}
                onChange={(e) => setDayOffset(Number.parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase">Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] text-muted-foreground">
              {format(date, "EEE, MMM d, yyyy")} —{" "}
              <span
                className={
                  status === "today"
                    ? "text-emerald-700 font-semibold"
                    : status === "past"
                      ? "text-muted-foreground"
                      : ""
                }
              >
                {status === "past" ? "past" : status === "today" ? "today" : "upcoming"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <SaveIndicator state={saveState} />
              <Button
                variant="ghost"
                size="sm"
                onClick={remove}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Checklist                                                          */
/* ------------------------------------------------------------------ */

function ChecklistPanel({
  hire,
  items,
  setItems,
  onChanged,
}: {
  hire: HireRow;
  items: ChecklistItemRow[];
  setItems: (next: ChecklistItemRow[]) => void;
  onChanged: () => void;
}) {
  const sections = Array.from(new Set(items.map((i) => i.section || "General")));
  const [adding, setAdding] = useState(false);
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  async function add(section: string) {
    setAdding(true);
    const sectionItems = items.filter((i) => i.section === section);
    const { error } = await supabase.from("onboarding_hire_checklist").insert({
      hire_id: hire.id,
      section,
      label: "New task",
      owner: null,
      sort_order: items.length + sectionItems.length,
    });
    setAdding(false);
    if (error) toast.error(error.message);
    else onChanged();
  }

  async function addNewSection() {
    if (!newSectionName.trim()) return;
    setNewSectionOpen(false);
    await add(newSectionName.trim());
    setNewSectionName("");
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground mb-3">No checklist items yet.</div>
        <Button size="sm" onClick={() => add("General")} disabled={adding}>
          <Plus className="size-4" /> Add first task
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <ChecklistSection
          key={section}
          section={section}
          allItems={items}
          setItems={setItems}
          onChanged={onChanged}
          onAdd={() => add(section)}
          adding={adding}
        />
      ))}
      <Dialog open={newSectionOpen} onOpenChange={setNewSectionOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Add section
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New section</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-xs">Section name</Label>
            <Input
              autoFocus
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNewSection();
              }}
              placeholder="e.g. Week 1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addNewSection}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChecklistSection({
  section,
  allItems,
  setItems,
  onChanged,
  onAdd,
  adding,
}: {
  section: string;
  allItems: ChecklistItemRow[];
  setItems: (next: ChecklistItemRow[]) => void;
  onChanged: () => void;
  onAdd: () => void;
  adding: boolean;
}) {
  const items = allItems.filter((i) => i.section === section);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    // Build a new full list, replacing this section's items with reordered + updated sort_order
    const others = allItems.filter((i) => i.section !== section);
    const reorderedWithOrder = reordered.map((it, idx) => ({ ...it, sort_order: idx }));
    setItems([...others, ...reorderedWithOrder]);
    await Promise.all(
      reorderedWithOrder.map((it) =>
        supabase
          .from("onboarding_hire_checklist")
          .update({ sort_order: it.sort_order })
          .eq("id", it.id),
      ),
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{section}</div>
        <Button size="sm" variant="ghost" onClick={onAdd} disabled={adding}>
          <Plus className="size-3.5" /> Item
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableChecklistRow key={item.id} item={item} onChanged={onChanged} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Card>
  );
}

function SortableChecklistRow({
  item,
  onChanged,
}: {
  item: ChecklistItemRow;
  onChanged: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <ChecklistItemEditor
        item={item}
        onChanged={onChanged}
        dragHandle={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-3.5" />
          </button>
        }
      />
    </div>
  );
}

function ChecklistItemEditor({
  item,
  onChanged,
  dragHandle,
}: {
  item: ChecklistItemRow;
  onChanged: () => void;
  dragHandle?: React.ReactNode;
}) {
  const [label, setLabel] = useState(item.label);
  const [owner, setOwner] = useState(item.owner ?? "");
  const [dayOffset, setDayOffset] = useState<string>(
    item.day_offset == null ? "" : String(item.day_offset),
  );

  const value = useMemo(() => ({ label, owner, dayOffset }), [label, owner, dayOffset]);
  const saveState = useAutoSave(value, async (v) => {
    const parsed = v.dayOffset.trim() === "" ? null : Number(v.dayOffset);
    const dayOffsetVal =
      parsed != null && Number.isFinite(parsed) ? Math.trunc(parsed) : null;
    const { error } = await supabase
      .from("onboarding_hire_checklist")
      .update({
        label: v.label,
        owner: v.owner.trim() || null,
        day_offset: dayOffsetVal,
      })
      .eq("id", item.id);
    if (error) throw error;
  });

  async function toggle() {
    const completed = !item.completed;
    const { error } = await supabase
      .from("onboarding_hire_checklist")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else onChanged();
  }
  async function remove() {
    const { error } = await supabase.from("onboarding_hire_checklist").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else onChanged();
  }

  return (
    <div className="grid grid-cols-[auto_auto_1fr_120px_72px_auto_auto] gap-2 items-center">
      {dragHandle ?? <span />}
      <input
        type="checkbox"
        checked={item.completed}
        onChange={toggle}
        className="size-4 accent-emerald-600 cursor-pointer"
      />
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className={item.completed ? "line-through text-muted-foreground" : ""}
      />
      <Input
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        placeholder="Owner"
        className="text-xs"
      />
      <Input
        value={dayOffset}
        onChange={(e) => setDayOffset(e.target.value.replace(/[^0-9-]/g, ""))}
        placeholder="Day"
        title="Day number relative to start (0 = first day). Leave empty for anytime."
        className="text-xs text-center tabular-nums"
      />
      <span className="text-[10px] text-muted-foreground whitespace-nowrap min-w-[44px] text-right">
        {saveState === "saving" ? "…" : saveState === "saved" ? "✓" : item.completed && item.completed_at ? format(new Date(item.completed_at), "MMM d") : ""}
      </span>
      <Button size="sm" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Apply template                                                     */
/* ------------------------------------------------------------------ */

function ApplyTemplateButton({
  hireId,
  onApplied,
}: {
  hireId: string;
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("onboarding_templates")
        .select("id, name, description, checklist, timeline, sort_order")
        .order("sort_order");
      setTemplates(
        ((data ?? []) as Array<Omit<TemplateRow, "checklist" | "timeline"> & { checklist: unknown; timeline: unknown }>).map((t) => ({
          ...t,
          checklist: safeTemplateChecklist(t.checklist),
          timeline: safeTemplateTimeline(t.timeline),
        })),
      );
    })();
  }, [open]);

  async function apply() {
    if (!selected) return;
    const tpl = templates.find((t) => t.id === selected);
    if (!tpl) return;
    setApplying(true);
    try {
      // Get existing checklist labels (per section) and timeline (offset+title) to skip duplicates
      const [existingChecklist, existingTimeline] = await Promise.all([
        supabase
          .from("onboarding_hire_checklist")
          .select("section, label")
          .eq("hire_id", hireId),
        supabase
          .from("onboarding_hire_timeline")
          .select("day_offset, title")
          .eq("hire_id", hireId),
      ]);
      const existingChecklistKeys = new Set(
        (existingChecklist.data ?? []).map((r) => `${r.section}::${r.label}`),
      );
      const existingTimelineKeys = new Set(
        (existingTimeline.data ?? []).map((r) => `${r.day_offset}::${r.title}`),
      );

      const newChecklist = tpl.checklist
        .filter((c) => !existingChecklistKeys.has(`${c.section || "General"}::${c.label}`))
        .map((c, i) => ({
          hire_id: hireId,
          section: c.section || "General",
          label: c.label,
          owner: c.owner ?? null,
          sort_order: 1000 + i,
        }));
      const newTimeline = tpl.timeline
        .filter((t) => !existingTimelineKeys.has(`${t.day_offset}::${t.title}`))
        .map((t, i) => ({
          hire_id: hireId,
          day_offset: t.day_offset,
          label: t.label,
          title: t.title,
          description: t.description ?? null,
          sort_order: 1000 + i,
        }));

      if (newChecklist.length > 0) {
        const { error } = await supabase.from("onboarding_hire_checklist").insert(newChecklist);
        if (error) throw error;
      }
      if (newTimeline.length > 0) {
        const { error } = await supabase.from("onboarding_hire_timeline").insert(newTimeline);
        if (error) throw error;
      }
      toast.success(
        `Added ${newChecklist.length} checklist · ${newTimeline.length} timeline items`,
      );
      setOpen(false);
      onApplied();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply template";
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="size-4" /> Apply template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply a template</DialogTitle>
        </DialogHeader>
        {templates.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No templates yet. Create one from the onboarding admin page.
          </div>
        ) : (
          <div className="space-y-3">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (() => {
              const tpl = templates.find((t) => t.id === selected);
              if (!tpl) return null;
              return (
                <div className="text-xs text-muted-foreground">
                  {tpl.description && <div className="mb-1">{tpl.description}</div>}
                  Adds {tpl.checklist.length} checklist items and {tpl.timeline.length} timeline
                  milestones. Duplicates are skipped.
                </div>
              );
            })()}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!selected || applying}>
            {applying ? "Applying…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
