import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Users,
  FileText,
  LayoutTemplate,
  MoreVertical,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { AdminBreadcrumb } from "@/components/admin-breadcrumb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/list-skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  type PageRow,
  type TemplateRow,
  safeBlocks,
  safeTemplateChecklist,
  safeTemplateTimeline,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { NewTemplateDialog } from "./admin_.onboarding_.templates.$templateId";

export const Route = createFileRoute("/admin_/onboarding")({
  head: () => ({ meta: [{ title: "Staff Onboarding · Passion Photography Hub" }] }),
  component: Page,
});

function Page() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin requireAdmin>
      <Inner onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

type Segment = "all" | "starting" | "active" | "completed" | "archived";

function Inner({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [hires, setHires] = useState<HireRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [progress, setProgress] = useState<Record<string, { done: number; total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<Segment>("all");

  async function load() {
    const [{ data: p }, { data: h }, { data: c }, { data: t }] = await Promise.all([
      supabase
        .from("onboarding_pages")
        .select("id, slug, title, subtitle, blocks, sort_order")
        .order("sort_order"),
      supabase
        .from("onboarding_hires")
        .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
        .order("start_date", { ascending: false }),
      supabase.from("onboarding_hire_checklist").select("id, hire_id, completed"),
      supabase
        .from("onboarding_templates")
        .select("id, name, description, checklist, timeline, sort_order")
        .order("sort_order"),
    ]);
    setPages(
      ((p ?? []) as Array<Omit<PageRow, "blocks"> & { blocks: unknown }>).map((row) => ({
        ...row,
        blocks: safeBlocks(row.blocks),
      })),
    );
    setHires((h ?? []) as HireRow[]);
    setTemplates(
      (
        (t ?? []) as Array<
          Omit<TemplateRow, "checklist" | "timeline"> & { checklist: unknown; timeline: unknown }
        >
      ).map((row) => ({
        ...row,
        checklist: safeTemplateChecklist(row.checklist),
        timeline: safeTemplateTimeline(row.timeline),
      })),
    );
    const map: Record<string, { done: number; total: number }> = {};
    for (const item of (c ?? []) as { hire_id: string; completed: boolean }[]) {
      const cur = map[item.hire_id] ?? { done: 0, total: 0 };
      cur.total += 1;
      if (item.completed) cur.done += 1;
      map[item.hire_id] = cur;
    }
    setProgress(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Compute status + filter
  const enriched = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return hires.map((h) => {
      const start = new Date(`${h.start_date}T00:00:00`);
      const dayN = differenceInCalendarDays(now, start) + 1;
      const pr = progress[h.id] ?? { done: 0, total: 0 };
      const pct = pr.total === 0 ? 0 : pr.done / pr.total;
      let status: "starting" | "active" | "completed" | "archived" | "behind";
      if (h.archived) status = "archived";
      else if (dayN <= 0) status = "starting";
      else if (dayN > 30 && pct === 1) status = "completed";
      else if (dayN > 7 && pct < 0.25 && pr.total > 0) status = "behind";
      else status = "active";
      return { hire: h, dayN, progress: pr, pct, status };
    });
  }, [hires, progress]);

  const filtered = useMemo(() => {
    if (segment === "all") return enriched.filter((e) => e.status !== "archived");
    if (segment === "starting") return enriched.filter((e) => e.status === "starting");
    if (segment === "active")
      return enriched.filter((e) => e.status === "active" || e.status === "behind");
    if (segment === "completed") return enriched.filter((e) => e.status === "completed");
    if (segment === "archived") return enriched.filter((e) => e.status === "archived");
    return enriched;
  }, [enriched, segment]);

  const counts = useMemo(() => {
    return {
      all: enriched.filter((e) => e.status !== "archived").length,
      starting: enriched.filter((e) => e.status === "starting").length,
      active: enriched.filter((e) => e.status === "active" || e.status === "behind").length,
      completed: enriched.filter((e) => e.status === "completed").length,
      archived: enriched.filter((e) => e.status === "archived").length,
    };
  }, [enriched]);

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Staff Onboarding" subtitle="New hire resources" />
      <AdminBreadcrumb items={[{ label: "Team", to: "/admin/team" }, { label: "Onboarding" }]} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* New hires — moved to top */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-base font-semibold tracking-tight inline-flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" /> New hires
            </h2>
            <NewHireDialog templates={templates} onCreated={load} />
          </div>

          {/* Segment bar */}
          <div className="flex flex-wrap gap-1 mb-3">
            {(
              [
                ["all", "All", counts.all],
                ["starting", "Starting soon", counts.starting],
                ["active", "Active", counts.active],
                ["completed", "Completed", counts.completed],
                ["archived", "Archived", counts.archived],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setSegment(key)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5",
                  segment === key
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span
                  className={cn(
                    "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full",
                    segment === key ? "bg-background/20" : "bg-muted",
                  )}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <ListSkeleton rows={3} />
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <div className="text-sm text-muted-foreground">
                {segment === "all" && hires.length === 0
                  ? "No new hires yet. Add one to start their onboarding."
                  : `No hires in this view.`}
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((e) => (
                <HireRowCard key={e.hire.id} entry={e} onChanged={load} />
              ))}
            </div>
          )}
        </div>

        {/* Shared pages */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold tracking-tight inline-flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" /> Shared pages
            </h2>
            <span className="text-xs text-muted-foreground">Visible to all hires</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pages.map((p) => (
                <Link
                  key={p.id}
                  to="/admin/onboarding/pages/$slug"
                  params={{ slug: p.slug }}
                >
                  <Card className="p-4 hover:border-foreground/30 transition-colors h-full">
                    <div className="font-medium">{p.title}</div>
                    {p.subtitle && (
                      <div className="text-xs text-muted-foreground mt-0.5">{p.subtitle}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Pencil className="size-3" /> {p.blocks.length} block
                      {p.blocks.length === 1 ? "" : "s"}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Templates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold tracking-tight inline-flex items-center gap-2">
              <LayoutTemplate className="size-4 text-muted-foreground" /> Templates
            </h2>
            <NewTemplateDialog
              onCreated={(id) =>
                navigate({
                  to: "/admin/onboarding/templates/$templateId",
                  params: { templateId: id },
                })
              }
            />
          </div>
          {loading ? null : templates.length === 0 ? (
            <Card className="p-6 text-center border-dashed">
              <div className="text-sm text-muted-foreground">
                No templates yet. Create one to pre-populate new hires' checklists and timelines.
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t) => (
                <Link
                  key={t.id}
                  to="/admin/onboarding/templates/$templateId"
                  params={{ templateId: t.id }}
                >
                  <Card className="p-4 hover:border-foreground/30 transition-colors h-full">
                    <div className="font-medium">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {t.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-3">
                      {t.checklist.length} checklist · {t.timeline.length} timeline
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Hire row with status chip + menu                                   */
/* ------------------------------------------------------------------ */

interface EnrichedHire {
  hire: HireRow;
  dayN: number;
  progress: { done: number; total: number };
  pct: number;
  status: "starting" | "active" | "completed" | "archived" | "behind";
}

function statusChip(e: EnrichedHire) {
  if (e.status === "archived")
    return { label: "Archived", className: "border-border bg-muted text-muted-foreground" };
  if (e.status === "starting") {
    const days = Math.abs(e.dayN) + 1;
    return {
      label: e.dayN === 0 ? "Starts today" : `Starts in ${days}d`,
      className: "border-amber-500/30 bg-amber-500/15 text-amber-700",
    };
  }
  if (e.status === "completed")
    return {
      label: "Onboarded",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    };
  if (e.status === "behind")
    return {
      label: "Behind",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  // active
  if (e.dayN >= 90) {
    const months = Math.floor(e.dayN / 30);
    return {
      label: `Month ${months}`,
      className: "border-border bg-card text-foreground",
    };
  }
  return {
    label: `Day ${e.dayN}`,
    className: "border-border bg-card text-foreground",
  };
}

function HireRowCard({ entry, onChanged }: { entry: EnrichedHire; onChanged: () => void }) {
  const { hire, progress, pct, status } = entry;
  const pctRound = Math.round(pct * 100);
  const chip = statusChip(entry);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function toggleArchive() {
    const { error } = await supabase
      .from("onboarding_hires")
      .update({ archived: !hire.archived })
      .eq("id", hire.id);
    if (error) toast.error(error.message);
    else {
      toast.success(hire.archived ? "Restored" : "Archived");
      onChanged();
    }
  }

  async function remove() {
    const { error } = await supabase.from("onboarding_hires").delete().eq("id", hire.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      onChanged();
    }
  }

  return (
    <Card className={cn("p-4 transition-colors", status === "archived" && "opacity-70")}>
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          to="/admin/onboarding/hires/$hireId"
          params={{ hireId: hire.id }}
          className="flex-1 min-w-0 hover:underline underline-offset-2"
        >
          <div className="font-medium truncate">{hire.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {hire.role_label ? `${hire.role_label} · ` : ""}
            {hire.email}
          </div>
        </Link>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          Starts {format(new Date(`${hire.start_date}T00:00:00`), "MMM d, yyyy")}
        </div>
        <div className="min-w-[140px]">
          <div className="text-xs text-muted-foreground mb-1 tabular-nums">
            {progress.done}/{progress.total} · {pctRound}%
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${pctRound}%` }}
            />
          </div>
        </div>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border whitespace-nowrap font-semibold",
            chip.className,
          )}
        >
          {chip.label}
        </span>
        {!hire.user_id && status !== "archived" && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-700">
            No login
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={toggleArchive}>
              {hire.archived ? (
                <>
                  <ArchiveRestore className="size-4" /> Restore
                </>
              ) : (
                <>
                  <Archive className="size-4" /> Archive
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${hire.name}?`}
        description="This permanently removes their timeline and checklist. Consider archiving instead."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* New hire dialog                                                    */
/* ------------------------------------------------------------------ */

function NewHireDialog({
  templates,
  onCreated,
}: {
  templates: TemplateRow[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [coordinator, setCoordinator] = useState("");
  const [templateId, setTemplateId] = useState<string>("__none");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !startDate) {
      toast.error("Name, email, and start date are required");
      return;
    }
    setSaving(true);
    const { data: created, error } = await supabase
      .from("onboarding_hires")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role_label: roleLabel.trim() || null,
        start_date: startDate,
        coordinator_name: coordinator.trim() || null,
      })
      .select("id")
      .maybeSingle();
    if (error || !created) {
      setSaving(false);
      toast.error(error?.message ?? "Failed to create");
      return;
    }

    if (templateId !== "__none") {
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        const checklistRows = tpl.checklist.map((c, i) => ({
          hire_id: created.id,
          section: c.section || "General",
          label: c.label,
          owner: c.owner ?? null,
          sort_order: i,
        }));
        const timelineRows = tpl.timeline.map((t, i) => ({
          hire_id: created.id,
          day_offset: t.day_offset,
          label: t.label,
          title: t.title,
          description: t.description ?? null,
          sort_order: i,
        }));
        if (checklistRows.length > 0) {
          await supabase.from("onboarding_hire_checklist").insert(checklistRows);
        }
        if (timelineRows.length > 0) {
          await supabase.from("onboarding_hire_timeline").insert(timelineRows);
        }
      }
    }

    setSaving(false);
    toast.success("Hire created");
    setOpen(false);
    setName("");
    setEmail("");
    setRoleLabel("");
    setCoordinator("");
    setTemplateId("__none");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New hire
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new hire</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">
              Email (must match the email they sign in with)
            </Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Role / track (optional)</Label>
            <Input
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              placeholder="e.g. Junior Designer"
            />
          </div>
          <div>
            <Label className="text-xs">Start date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Coordinator (optional)</Label>
            <Input
              value={coordinator}
              onChange={(e) => setCoordinator(e.target.value)}
              placeholder="Who is onboarding them"
            />
          </div>
          <div>
            <Label className="text-xs">Apply template (optional)</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None — start blank</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.checklist.length} + {t.timeline.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create hire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
