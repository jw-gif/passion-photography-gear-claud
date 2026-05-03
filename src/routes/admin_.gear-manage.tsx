import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { locationLabel } from "@/lib/locations";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import QRCode from "qrcode";
import {
  Camera,
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Search,
  CircleCheck,
  CircleSlash,
  Wrench,
  Sparkles,
  QrCode,
  Printer,
  History,
  Inbox,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import { GearIcon, ICON_KINDS, ICON_LABELS, autoIconKindFor, type IconKind } from "@/lib/gear-icons";
import { HubHeader } from "@/components/hub-header";
import { AdminBreadcrumb } from "@/components/admin-breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/gear-manage")({
  head: () => ({
    meta: [
      { title: "Manage Gear · Passion Photography Hub" },
      {
        name: "description",
        content: "Add, rename, retire, and manage availability of photography gear.",
      },
    ],
  }),
  component: ManagePage,
});

type GearStatus = "active" | "out_of_service" | "out_for_repair";

interface GearRow {
  id: string;
  name: string;
  current_location: string;
  status: GearStatus;
  icon_kind: string | null;
  requestable: boolean;
}

const STATUS_OPTIONS: { value: GearStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "active", label: "Active", icon: CircleCheck },
  { value: "out_of_service", label: "Out of service", icon: CircleSlash },
  { value: "out_for_repair", label: "Out for repair", icon: Wrench },
];

function statusMeta(status: GearStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function statusBadgeClasses(status: GearStatus): string {
  switch (status) {
    case "active":
      return "bg-loc-trilith/15 text-loc-trilith";
    case "out_of_service":
      return "bg-destructive/15 text-destructive";
    case "out_for_repair":
      return "bg-loc-cumberland/20 text-loc-cumberland-foreground";
  }
}

function ManagePage() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <ManageView onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function ManageView({ onLogout }: { onLogout: () => void }) {
  const [gear, setGear] = useState<GearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | GearStatus>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GearRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function loadGear() {
    setLoading(true);
    const { data, error } = await supabase
      .from("gear")
      .select("id, name, current_location, status, icon_kind, requestable")
      .order("id", { ascending: true });
    if (error) {
      toast.error("Couldn't load gear", { description: error.message });
    }
    setGear((data || []) as GearRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadGear();
    const channel = supabase
      .channel("gear-manage-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gear" }, () => loadGear())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gear.filter((g) => {
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [gear, query, statusFilter]);

  const counts = useMemo(() => {
    const c = { active: 0, out_of_service: 0, out_for_repair: 0 };
    for (const g of gear) c[g.status]++;
    return c;
  }, [gear]);

  async function handleStatusChange(g: GearRow, status: GearStatus) {
    if (g.status === status) return;
    const previous = g.status;
    setGear((prev) => prev.map((x) => (x.id === g.id ? { ...x, status } : x)));
    const { error } = await supabase.from("gear").update({ status }).eq("id", g.id);
    if (error) {
      setGear((prev) => prev.map((x) => (x.id === g.id ? { ...x, status: previous } : x)));
      toast.error(`Couldn't update ${g.name}`, { description: error.message });
      return;
    }
    toast.success(`${g.name} → ${statusMeta(status).label}`);
  }

  async function handleRenameSave(g: GearRow) {
    const newName = editName.trim();
    if (!newName) {
      toast.error("Name can't be empty");
      return;
    }
    if (newName === g.name) {
      setEditingId(null);
      return;
    }
    const previous = g.name;
    setGear((prev) => prev.map((x) => (x.id === g.id ? { ...x, name: newName } : x)));
    setEditingId(null);
    const { error } = await supabase.from("gear").update({ name: newName }).eq("id", g.id);
    if (error) {
      setGear((prev) => prev.map((x) => (x.id === g.id ? { ...x, name: previous } : x)));
      toast.error("Couldn't rename gear", { description: error.message });
      return;
    }
    toast.success(`Renamed to "${newName}"`);
  }

  async function handleDelete(g: GearRow) {
    setDeleteTarget(null);
    const previous = gear;
    setGear((prev) => prev.filter((x) => x.id !== g.id));
    const { error } = await supabase.from("gear").delete().eq("id", g.id);
    if (error) {
      setGear(previous);
      toast.error(`Couldn't delete ${g.name}`, { description: error.message });
      return;
    }
    toast.success(`Deleted ${g.name}`);
  }

  async function handleIconChange(g: GearRow, iconKind: string | null) {
    if ((g.icon_kind ?? null) === iconKind) return;
    const previous = g.icon_kind;
    setGear((prev) => prev.map((x) => (x.id === g.id ? { ...x, icon_kind: iconKind } : x)));
    const { error } = await supabase
      .from("gear")
      .update({ icon_kind: iconKind })
      .eq("id", g.id);
    if (error) {
      setGear((prev) => prev.map((x) => (x.id === g.id ? { ...x, icon_kind: previous } : x)));
      toast.error(`Couldn't update icon for ${g.name}`, { description: error.message });
      return;
    }
    toast.success(
      iconKind === null
        ? `${g.name} icon set to auto`
        : `${g.name} icon updated`,
    );
  }

  const handleRequestableToggle = async (g: GearRow) => {
    const nextValue = !g.requestable;
    setGear((prev) => prev.map((x) => (x.id === g.id ? { ...x, requestable: nextValue } : x)));
    const { error } = await supabase.from("gear").update({ requestable: nextValue }).eq("id", g.id);
    if (error) {
      setGear((prev) => prev.map((x) => (x.id === g.id ? { ...x, requestable: !nextValue } : x)));
      toast.error(`Couldn't update ${g.name}`, { description: error.message });
      return;
    }
    toast.success(nextValue ? `${g.name} is now requestable` : `${g.name} hidden from requests`);
  };

  async function handleBulkStatus(status: GearStatus) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    const previous = gear;
    setGear((prev) => prev.map((x) => (selectedIds.has(x.id) ? { ...x, status } : x)));
    const { error } = await supabase.from("gear").update({ status }).in("id", ids);
    setBulkBusy(false);
    if (error) {
      setGear(previous);
      toast.error("Couldn't update status", { description: error.message });
      return;
    }
    toast.success(`Updated ${ids.length} item${ids.length === 1 ? "" : "s"} → ${statusMeta(status).label}`);
  }

  async function handleBulkRequestable(requestable: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    const previous = gear;
    setGear((prev) => prev.map((x) => (selectedIds.has(x.id) ? { ...x, requestable } : x)));
    const { error } = await supabase.from("gear").update({ requestable }).in("id", ids);
    setBulkBusy(false);
    if (error) {
      setGear(previous);
      toast.error("Couldn't update visibility", { description: error.message });
      return;
    }
    toast.success(
      `${ids.length} item${ids.length === 1 ? "" : "s"} ${requestable ? "shown on" : "hidden from"} request page`,
    );
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    setBulkDeleteOpen(false);
    if (ids.length === 0) return;
    setBulkBusy(true);
    const previous = gear;
    setGear((prev) => prev.filter((x) => !selectedIds.has(x.id)));
    const { error } = await supabase.from("gear").delete().in("id", ids);
    setBulkBusy(false);
    if (error) {
      setGear(previous);
      toast.error("Couldn't delete gear", { description: error.message });
      return;
    }
    clearSelection();
    toast.success(`Deleted ${ids.length} item${ids.length === 1 ? "" : "s"}`);
  }

  async function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name can't be empty");
      return;
    }
    // ID is generated by the database (short random text code).
    const { data, error } = await supabase
      .from("gear")
      .insert({
        name: trimmed,
        current_location: "515",
        status: "active",
      })
      .select()
      .single();
    if (error) {
      toast.error("Couldn't add gear", { description: error.message });
      return;
    }
    if (data) {
      setGear((prev) => [...prev, data as GearRow].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setShowAdd(false);
    toast.success(`Added ${trimmed}`);
  }

  const filteredIds = useMemo(() => filtered.map((g) => g.id), [filtered]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected =
    !allFilteredSelected && filteredIds.some((id) => selectedIds.has(id));

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function exportSelectedQrSheet() {
    const items = gear.filter((g) => selectedIds.has(g.id));
    if (items.length === 0) {
      toast.error("Select at least one item to export");
      return;
    }
    setExporting(true);
    try {
      const PUBLIC_ORIGIN = "https://passionphotography.team";
      const cards = await Promise.all(
        items.map(async (g) => {
          const url = `${PUBLIC_ORIGIN}/?gear=${g.id}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 600,
            margin: 1,
            errorCorrectionLevel: "H",
          });
          return { id: g.id, name: g.name, url, dataUrl };
        }),
      );

      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Popup blocked", {
          description: "Allow popups for this site to export QR codes.",
        });
        return;
      }

      const escapeHtml = (s: string) =>
        s.replace(/[&<>"']/g, (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
        );

      const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Gear QR Codes (${cards.length})</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f5f5f5;
    color: #111;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    max-width: 1100px;
    margin: 0 auto 20px;
  }
  .toolbar h1 { font-size: 16px; margin: 0; font-weight: 600; }
  .toolbar button {
    background: #111; color: #fff; border: 0; border-radius: 6px;
    padding: 8px 14px; font-size: 14px; cursor: pointer; font-weight: 500;
  }
  .sheet {
    max-width: 1100px;
    margin: 0 auto;
    background: #fff;
    padding: 24px;
    border-radius: 8px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  .card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .card img {
    width: 100%;
    height: auto;
    max-width: 220px;
    aspect-ratio: 1 / 1;
    image-rendering: pixelated;
  }
  .name {
    font-weight: 600;
    font-size: 13px;
    margin-top: 10px;
    line-height: 1.3;
    word-break: break-word;
  }
  .meta {
    font-size: 10px;
    color: #666;
    margin-top: 4px;
    word-break: break-all;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .toolbar { display: none; }
    .sheet { box-shadow: none; padding: 12px; max-width: none; border-radius: 0; }
    .card { border-color: #bbb; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <h1>${cards.length} QR code${cards.length === 1 ? "" : "s"} · Passion Gear</h1>
    <button onclick="window.print()">Print</button>
  </div>
  <div class="sheet">
    ${cards
      .map(
        (c) => `
      <div class="card">
        <img src="${c.dataUrl}" alt="QR for ${escapeHtml(c.name)}" />
        <div class="name">${escapeHtml(c.name)}</div>
        <div class="meta">ID #${c.id}</div>
      </div>`,
      )
      .join("")}
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 400);
    });
  </script>
</body>
</html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();
      toast.success(`Opened print sheet for ${cards.length} QR code${cards.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error("Couldn't generate QR codes", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Manage Gear" subtitle="Add, rename, retire" />
      <AdminBreadcrumb items={[{ label: "Gear", to: "/admin/gear" }, { label: "Manage" }]} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Summary chips */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              statusFilter === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-background border-border hover:border-foreground/30",
            )}
          >
            All <span className="opacity-60">· {gear.length}</span>
          </button>
          {STATUS_OPTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-1.5",
                  statusFilter === s.value
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background border-border hover:border-foreground/30",
                )}
              >
                <Icon className="size-3.5" />
                {s.label} <span className="opacity-60">· {counts[s.value]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gear by name…"
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowAdd(true)} className="sm:ml-auto">
            <Plus className="size-4" /> Add gear
          </Button>
        </div>

        {/* Bulk selection bar */}
        <div className="flex items-center gap-2 flex-wrap mb-3 px-1">
          <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <Checkbox
              checked={
                allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false
              }
              onCheckedChange={() => toggleSelectAllFiltered()}
              disabled={filtered.length === 0}
              aria-label="Select all visible gear"
            />
            <span>
              {selectedIds.size === 0
                ? "Select gear for bulk actions"
                : `${selectedIds.size} selected`}
            </span>
          </label>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={selectedIds.size === 0 || bulkBusy}>
                  <CircleCheck className="size-4" /> Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {STATUS_OPTIONS.map((s) => (
                  <DropdownMenuItem key={s.value} onClick={() => handleBulkStatus(s.value)}>
                    <s.icon className="size-4" /> {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={selectedIds.size === 0 || bulkBusy}>
                  <Eye className="size-4" /> Visibility
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkRequestable(true)}>
                  <Eye className="size-4" /> Show on request page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkRequestable(false)}>
                  <EyeOff className="size-4" /> Hide from request page
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={exportSelectedQrSheet}
              disabled={selectedIds.size === 0 || exporting}
            >
              <Printer className="size-4" />
              {exporting ? "Generating…" : `QR sheet${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={selectedIds.size === 0 || bulkBusy}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">Loading gear…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-12 text-center">
            {gear.length === 0 ? "No gear yet. Add your first item." : "No gear matches these filters"}
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border">
              {filtered.map((g) => {
                const meta = statusMeta(g.status);
                const Icon = meta.icon;
                const isEditing = editingId === g.id;
                return (
                  <li
                    key={g.id}
                    className={cn(
                      "p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap",
                      g.status !== "active" && "bg-muted/20",
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(g.id)}
                      onCheckedChange={() => toggleSelected(g.id)}
                      aria-label={`Select ${g.name}`}
                      className="shrink-0"
                    />
                    <IconPickerButton gear={g} onChange={(k) => handleIconChange(g, k)} />
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameSave(g);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                            className="h-8"
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleRenameSave(g)}>
                            <Check className="size-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium flex items-center gap-2">
                            <span className={cn("truncate", g.status !== "active" && "text-muted-foreground")}>
                              {g.name}
                            </span>
                            <button
                              onClick={() => { setEditingId(g.id); setEditName(g.name); }}
                              className="text-muted-foreground/50 hover:text-foreground transition-colors"
                              aria-label="Rename"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            ID #{g.id} · {locationLabel(g.current_location)}
                          </div>
                        </>
                      )}
                    </div>

                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 shrink-0",
                        statusBadgeClasses(g.status),
                      )}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </span>

                    <Select
                      value={g.status}
                      onValueChange={(v) => handleStatusChange(g, v as GearStatus)}
                    >
                      <SelectTrigger className="w-[170px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            <span className="inline-flex items-center gap-2">
                              <s.icon className="size-3.5" />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRequestableToggle(g)}
                      className={cn(
                        "shrink-0",
                        g.requestable
                          ? "text-muted-foreground hover:text-foreground"
                          : "text-loc-cumberland-foreground hover:text-loc-cumberland-foreground bg-loc-cumberland/20 hover:bg-loc-cumberland/30",
                      )}
                      aria-label={g.requestable ? `Hide ${g.name} from request page` : `Show ${g.name} on request page`}
                      title={g.requestable ? "Visible on request page — click to hide" : "Hidden from request page — click to show"}
                    >
                      {g.requestable ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(g)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Delete ${g.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {showAdd && <AddGearDialog onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the gear item and its entire activity history.
              Any printed QR codes pointing to it will stop working. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} gear item{selectedIds.size === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected gear and all of their activity history.
              Any printed QR codes pointing to them will stop working. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedIds.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function AddGearDialog({
  onAdd,
  onClose,
}: {
  onAdd: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    await onAdd(name);
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <Card className="p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold tracking-tight">Add gear</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="gear-name" className="text-sm font-medium block mb-2">
              Name
            </label>
            <Input
              id="gear-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sony 24-70mm f/2.8 GM II"
              autoFocus
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Will be added to <span className="font-medium">515</span> as Active. You can move it from the dashboard.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || submitting}>
              {submitting ? "Adding…" : "Add gear"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function IconPickerButton({
  gear,
  onChange,
}: {
  gear: GearRow;
  onChange: (kind: string | null) => void;
}) {
  const autoKind = autoIconKindFor(gear.name);
  const isAuto = !gear.icon_kind;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "shrink-0 rounded-md p-1.5 -m-1.5 hover:bg-muted transition-colors group relative",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label={`Change icon for ${gear.name}`}
          title="Click to change icon"
        >
          <GearIcon
            name={gear.name}
            iconKind={gear.icon_kind}
            className="size-6 text-foreground/80"
          />
          <Pencil className="size-2.5 text-muted-foreground absolute -bottom-0.5 -right-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-full p-px" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          Icon
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left transition-colors",
            isAuto ? "bg-muted font-medium" : "hover:bg-muted",
          )}
        >
          <span className="size-8 rounded-md border border-border flex items-center justify-center bg-background">
            <Sparkles className="size-3.5 text-muted-foreground" />
          </span>
          <div className="flex-1 min-w-0">
            <div>Auto</div>
            <div className="text-xs text-muted-foreground truncate">
              {ICON_LABELS[autoKind]} (from name)
            </div>
          </div>
          {isAuto && <Check className="size-4 text-foreground" />}
        </button>

        <div className="h-px bg-border my-2" />

        <div className="grid grid-cols-4 gap-1.5">
          {ICON_KINDS.map((kind) => {
            const selected = gear.icon_kind === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onChange(kind)}
                title={ICON_LABELS[kind]}
                className={cn(
                  "aspect-square rounded-md border flex items-center justify-center transition-colors",
                  selected
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:border-foreground/40 hover:bg-muted",
                )}
                aria-label={ICON_LABELS[kind]}
                aria-pressed={selected}
              >
                <GearIcon
                  name=""
                  iconKind={kind}
                  className="size-7 text-foreground/80"
                />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
