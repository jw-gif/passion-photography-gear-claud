import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  Check,
  X,
  Copy,
  Users,
  Wrench,
  History,
  Inbox,
  Mail,
  Plus,
  Search,
  Upload,
  ExternalLink,
  Camera,
  ShieldCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/password-input";
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
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HubHeader } from "@/components/hub-header";
import { AdminBreadcrumb } from "@/components/admin-breadcrumb";
import {
  PHOTOGRAPHER_TIERS,
  type PhotographerTier,
  tierLabel,
  tierBadgeClasses,
  generatePhotographerToken,
} from "@/lib/photographers";
import { PhotographerBulkImportDialog } from "@/components/photographer-bulk-import-dialog";

type TeamTab = "photographers" | "admins";

interface TeamSearch {
  tab?: TeamTab;
}

export const Route = createFileRoute("/admin_/team")({
  validateSearch: (search: Record<string, unknown>): TeamSearch => {
    const t = search.tab;
    return {
      tab: t === "admins" || t === "photographers" ? t : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Team · Passion Photography Hub" },
      {
        name: "description",
        content: "Manage photographers and admins.",
      },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <TeamView onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function TeamView({ onLogout }: { onLogout: () => void }) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const initialTab: TeamTab = search.tab ?? "photographers";
  const [tab, setTab] = useState<TeamTab>(initialTab);

  useEffect(() => {
    if (search.tab && search.tab !== tab) setTab(search.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.tab]);

  function handleTabChange(value: string) {
    const t = (value === "admins" ? "admins" : "photographers") as TeamTab;
    setTab(t);
    navigate({ search: { tab: t }, replace: true });
  }

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Team" subtitle="Photographers & admins" />
      <AdminBreadcrumb items={[{ label: "Team", to: "/admin/team" }, { label: "Members" }]} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage who has access to the hub and who shoots for it.
          </p>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="photographers" className="gap-2">
              <Camera className="size-4" /> Photographers
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <ShieldCheck className="size-4" /> Admins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photographers" className="mt-0">
            <PhotographersPanel />
          </TabsContent>
          <TabsContent value="admins" className="mt-0">
            <AdminsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Photographers panel
// ---------------------------------------------------------------------------

interface Photographer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tier: PhotographerTier;
  token: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function PhotographersPanel() {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Photographer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Photographer | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("photographers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPhotographers((data ?? []) as Photographer[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("photographers_team")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photographers" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? photographers.filter((p) =>
          [p.name, p.email, p.phone ?? "", p.tier].join(" ").toLowerCase().includes(q),
        )
      : photographers;
    // Group by tier rank: Point → Door Holder → Training, then by name.
    const tierOrder: Record<PhotographerTier, number> = {
      point: 0,
      door_holder: 1,
      training_door_holder: 2,
    };
    return [...list].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const tr = tierOrder[a.tier] - tierOrder[b.tier];
      if (tr !== 0) return tr;
      return a.name.localeCompare(b.name);
    });
  }, [photographers, query]);

  async function toggleActive(p: Photographer) {
    const { error } = await supabase
      .from("photographers")
      .update({ active: !p.active })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success(p.active ? "Deactivated" : "Activated");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const p = deleteTarget;
    setDeleteTarget(null);
    const { error } = await supabase.from("photographers").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success(`Removed ${p.name}`);
  }

  function jobsLink(token: string): string {
    if (typeof window === "undefined") return `/jobs?t=${token}`;
    return `${window.location.origin}/jobs?t=${token}`;
  }

  async function copyLink(p: Photographer) {
    const url = jobsLink(p.token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Link copied for ${p.name}`);
    } catch {
      toast.error("Couldn't copy. Long-press to copy manually.");
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          {loading
            ? "Loading…"
            : `${photographers.length} photographer${photographers.length === 1 ? "" : "s"}`}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="size-4" />
            <span className="hidden sm:inline">Bulk import</span>
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="size-4" /> Add
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-4 px-3 py-2 rounded-md border bg-muted/30">
        ⚠️ Personal links — anyone with one can claim shoots as that
        photographer. Send via email/SMS only to the intended person.
      </div>

      {loading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {photographers.length === 0
              ? "No photographers yet. Add one to get started."
              : "No matches."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const initials = p.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((s) => s[0]?.toUpperCase() ?? "")
              .join("");
            return (
              <Card key={p.id} className={cn("p-4", !p.active && "opacity-60")}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{p.name}</span>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full border",
                          tierBadgeClasses(p.tier),
                        )}
                      >
                        {tierLabel(p.tier)}
                      </span>
                      {!p.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <a
                        href={`mailto:${p.email}`}
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        <Mail className="size-3.5" />
                        {p.email}
                      </a>
                      {p.phone && (
                        <>
                          <span className="text-muted-foreground/60">·</span>
                          <span>{p.phone}</span>
                        </>
                      )}
                      <span className="text-muted-foreground/60">·</span>
                      <span>Added {format(parseISO(p.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => copyLink(p)}>
                      <Copy className="size-4" /> Copy link
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={jobsLink(p.token)} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" /> Open
                      </a>
                    </Button>
                    <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(p)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PhotographerDialog open={addOpen} onClose={() => setAddOpen(false)} photographer={null} />
      <PhotographerDialog open={!!editing} onClose={() => setEditing(null)} photographer={editing} />
      <PhotographerBulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their personal link will stop working. Past assignments are preserved
              but they won't be able to claim new shoots. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PhotographerDialog({
  open,
  onClose,
  photographer,
}: {
  open: boolean;
  onClose: () => void;
  photographer: Photographer | null;
}) {
  const isEdit = !!photographer;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<PhotographerTier>("door_holder");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(photographer?.name ?? "");
    setEmail(photographer?.email ?? "");
    setPhone(photographer?.phone ?? "");
    setTier(photographer?.tier ?? "door_holder");
  }, [photographer, open]);

  async function save() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    if (isEdit && photographer) {
      const { error } = await supabase
        .from("photographers")
        .update({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          tier,
        })
        .eq("id", photographer.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Saved");
        onClose();
      }
    } else {
      const { error } = await supabase.from("photographers").insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        tier,
        token: generatePhotographerToken(),
      });
      if (error) toast.error(error.message);
      else {
        toast.success(`${name} added`);
        onClose();
      }
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit photographer" : "Add photographer"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update name, email, phone, or tier. Their personal link does not change."
              : "We'll generate a personal link you can send via email or SMS."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ph-name">Name</Label>
            <Input id="ph-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ph-email">Email</Label>
            <Input
              id="ph-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ph-phone">Phone (optional)</Label>
            <Input
              id="ph-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 5555"
            />
          </div>
          <div>
            <Label>Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as PhotographerTier)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTOGRAPHER_TIERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Point sees paid Point shoots and can also pick up unpaid Door Holder
              spots. Door Holder sees Door Holder + Training. Training only sees
              Training spots.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            <Plus className="size-4" />
            {isEdit ? "Save" : "Add photographer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Admins panel
// ---------------------------------------------------------------------------

interface AdminItem {
  id: string;
  email: string | null;
  display_name: string;
  role: "admin" | "team";
  created_at: string;
  last_sign_in_at: string | null;
}

async function authedFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });
}

function AdminsPanel() {
  const { user, displayName, refreshProfile } = useAuth();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pwTarget, setPwTarget] = useState<AdminItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminItem | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{
    email: string;
    password: string | null;
  } | null>(null);

  async function load() {
    setLoading(true);
    const res = await authedFetch("/api/admins");
    if (!res.ok) {
      const text = await res.text();
      toast.error("Couldn't load admins", { description: text });
      setAdmins([]);
      setLoading(false);
      return;
    }
    const json = (await res.json()) as { admins: AdminItem[] };
    setAdmins(json.admins);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(input: {
    email: string;
    display_name: string;
    password: string;
    role: "admin" | "team";
  }) {
    const res = await authedFetch("/api/admins", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as {
      admin?: { email: string; temporary_password: string | null };
      error?: string;
    };
    if (!res.ok || !json.admin) {
      toast.error("Couldn't invite member", { description: json.error });
      return;
    }
    setShowInvite(false);
    setCreatedSummary({
      email: json.admin.email,
      password: json.admin.temporary_password,
    });
    await load();
  }

  async function handleRoleChange(a: AdminItem, role: "admin" | "team") {
    if (role === a.role) return;
    const res = await authedFetch("/api/admins", {
      method: "PATCH",
      body: JSON.stringify({ id: a.id, role }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error("Couldn't change role", { description: json.error });
      return;
    }
    setAdmins((prev) => prev.map((x) => (x.id === a.id ? { ...x, role } : x)));
    toast.success(`${a.display_name} is now ${role === "admin" ? "an Admin" : "a Team member"}`);
  }

  async function handleRenameSave(a: AdminItem) {
    const dn = editName.trim();
    if (!dn) {
      toast.error("Name can't be empty");
      return;
    }
    if (dn === a.display_name) {
      setEditingId(null);
      return;
    }
    const res = await authedFetch("/api/admins", {
      method: "PATCH",
      body: JSON.stringify({ id: a.id, display_name: dn }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error("Couldn't rename", { description: json.error });
      return;
    }
    setEditingId(null);
    setAdmins((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, display_name: dn } : x)),
    );
    if (a.id === user?.id) await refreshProfile();
    toast.success(`Renamed to "${dn}"`);
  }

  async function handlePasswordChange(a: AdminItem, pw: string) {
    const res = await authedFetch("/api/admins", {
      method: "PATCH",
      body: JSON.stringify({ id: a.id, password: pw }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error("Couldn't update password", { description: json.error });
      return false;
    }
    toast.success(`Password updated for ${a.display_name}`);
    setPwTarget(null);
    return true;
  }

  async function handleDelete(a: AdminItem) {
    setDeleteTarget(null);
    const res = await authedFetch("/api/admins", {
      method: "DELETE",
      body: JSON.stringify({ id: a.id }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error("Couldn't remove admin", { description: json.error });
      return;
    }
    setAdmins((prev) => prev.filter((x) => x.id !== a.id));
    toast.success(`Removed ${a.display_name}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4" />
          {loading
            ? "Loading…"
            : `${admins.length} member${admins.length === 1 ? "" : "s"}`}
          {displayName && (
            <span className="ml-2 text-foreground/70">
              · Signed in as <span className="font-medium text-foreground">{displayName}</span>
            </span>
          )}
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="size-4" /> Add member
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading admins…</Card>
      ) : admins.length === 0 ? (
        <Card className="p-12 text-center">
          <ShieldCheck className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No admins yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {admins.map((a) => {
              const isEditing = editingId === a.id;
              const isMe = a.id === user?.id;
              const initials = (a.display_name || a.email || "?")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase() ?? "")
                .join("");
              return (
                <li
                  key={a.id}
                  className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap"
                >
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSave(a);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="h-8 max-w-[240px]"
                          maxLength={50}
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleRenameSave(a)}>
                          <Check className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium flex items-center gap-2">
                          <span className="truncate">{a.display_name}</span>
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full border font-semibold",
                              a.role === "admin"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-muted text-muted-foreground border-border",
                            )}
                          >
                            {a.role === "admin" ? "Admin" : "Team"}
                          </span>
                          {isMe && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                              you
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(a.id);
                              setEditName(a.display_name);
                            }}
                            className="text-muted-foreground/50 hover:text-foreground transition-colors"
                            aria-label="Rename"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {a.email ?? "(no email)"}
                          {a.last_sign_in_at && (
                            <>
                              {" · "}
                              Last sign-in {new Date(a.last_sign_in_at).toLocaleDateString()}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <Select
                    value={a.role}
                    onValueChange={(v) => handleRoleChange(a, v as "admin" | "team")}
                    disabled={isMe}
                  >
                    <SelectTrigger
                      className="h-8 w-[110px]"
                      title={isMe ? "You can't change your own role" : "Change role"}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPwTarget(a)}
                    aria-label={`Set password for ${a.display_name}`}
                    title={isMe ? "Change your password" : `Set password for ${a.display_name}`}
                  >
                    <KeyRound className="size-4" />
                    <span className="hidden sm:inline ml-1.5">
                      {isMe ? "Change password" : "Set password"}
                    </span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(a)}
                    disabled={isMe}
                    title={isMe ? "You can't remove your own account" : `Remove ${a.display_name}`}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {showInvite && (
        <InviteAdminDialog onInvite={handleInvite} onClose={() => setShowInvite(false)} />
      )}

      {pwTarget && (
        <PasswordDialog
          target={pwTarget}
          onClose={() => setPwTarget(null)}
          onSubmit={(pw) => handlePasswordChange(pwTarget, pw)}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes their account and revokes admin access. Activity history they recorded
              will keep their name but they won't be able to sign in. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {createdSummary && (
        <CredentialsDialog
          summary={createdSummary}
          onClose={() => setCreatedSummary(null)}
        />
      )}
    </div>
  );
}

function InviteAdminDialog({
  onInvite,
  onClose,
}: {
  onInvite: (input: {
    email: string;
    display_name: string;
    password: string;
    role: "admin" | "team";
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "team">("team");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pw = "";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    for (let i = 0; i < arr.length; i++) pw += chars[arr[i] % chars.length];
    setPassword(pw + "!");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !displayName.trim()) {
      setError("Email and display name are required.");
      return;
    }
    if (password && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    await onInvite({
      email: email.trim(),
      display_name: displayName.trim(),
      password: password.trim(),
      role,
    });
    setSubmitting(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Invite a new team member or admin. You'll see their temporary password once.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="invite-name">Display name</Label>
            <Input
              id="invite-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jenna"
              autoFocus
              maxLength={50}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@passioncitychurch.com"
              autoComplete="off"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "team")}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team">Team — full access except onboarding backend</SelectItem>
                <SelectItem value="admin">Admin — full access including onboarding</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="invite-pw">Temporary password</Label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs text-primary hover:underline"
              >
                Generate
              </button>
            </div>
            <PasswordInput
              id="invite-pw"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground mt-2">
              You'll see this once after creating the account — share it with them and have them
              change it from this page after sign-in.
            </p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({
  target,
  onClose,
  onSubmit,
}: {
  target: AdminItem;
  onClose: () => void;
  onSubmit: (pw: string) => Promise<boolean>;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const ok = await onSubmit(pw);
    setSubmitting(false);
    if (ok) onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set password for {target.display_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="set-pw">New password</Label>
            <PasswordInput
              id="set-pw"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="set-pw2">Confirm password</Label>
            <PasswordInput
              id="set-pw2"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="mt-1.5"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CredentialsDialog({
  summary,
  onClose,
}: {
  summary: { email: string; password: string | null };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  function copy(text: string, which: "email" | "password") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin created</DialogTitle>
          <DialogDescription>
            Share these credentials.{" "}
            {summary.password ? "This password" : "The password they were given"} won't be shown
            again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Email</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-muted rounded px-3 py-2 truncate">
                {summary.email}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(summary.email, "email")}>
                <Copy className="size-3.5" />
                {copied === "email" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          {summary.password && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Temporary password
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted rounded px-3 py-2 truncate font-mono">
                  {summary.password}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(summary.password!, "password")}
                >
                  <Copy className="size-3.5" />
                  {copied === "password" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
