import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
  Wrench,
  X,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  gearRequestBadgeClasses,
  gearRequestStatusLabel,
  statusBadgeClasses,
  statusLabel,
  type GearRequestStatus,
  type PhotoRequestStatus,
} from "@/lib/orgs";
import { locationLabel } from "@/lib/locations";
import { RequestActionRail } from "@/components/request-action-rail";
import { HistoryTimeline } from "@/components/history-timeline";
import { useIsMobile } from "@/hooks/use-mobile";
import { relativeDayLabel } from "@/lib/relative-date";

export type DetailEvent =
  | { kind: "photo"; id: string }
  | { kind: "gear"; id: string };

interface PhotoDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  team: string | null;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  spans_multiple_days: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  status: PhotoRequestStatus;
  on_site_contact_name: string | null;
  on_site_contact_phone: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface GearDetail {
  id: string;
  requestor_name: string;
  location: string;
  needed_date: string;
  notes: string | null;
  status: GearRequestStatus;
}

interface GearItemRow {
  id: string;
  gear_id: string;
}

interface GearRow {
  id: string;
  name: string;
}

interface OpeningRow {
  id: string;
  role: string;
}

interface AssignmentRow {
  id: string;
  opening_id: string;
}

interface Roster {
  filled: number;
  total: number;
}

interface Props {
  event: DetailEvent | null;
  onClose: () => void;
  onChanged?: () => void;
  /**
   * Optional list of navigable events. When provided the dialog shows
   * Prev/Next controls (and supports J/K hotkeys) for browsing the queue.
   */
  navList?: DetailEvent[];
  onNavigate?: (next: DetailEvent) => void;
}

export function EventDetailDialog({ event, onClose, onChanged, navList, onNavigate }: Props) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [gear, setGear] = useState<GearDetail | null>(null);
  const [gearItems, setGearItems] = useState<{ id: string; name: string }[]>([]);
  const [roster, setRoster] = useState<Roster | null>(null);

  useEffect(() => {
    if (!event) {
      setPhoto(null);
      setGear(null);
      setGearItems([]);
      setRoster(null);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.kind, event?.id]);

  // J/K keyboard navigation between requests in the queue, and A to approve.
  useEffect(() => {
    if (!event) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!navList || navList.length === 0) return;
      const idx = navList.findIndex((n) => n.kind === event!.kind && n.id === event!.id);
      if (e.key === "j" || e.key === "ArrowRight") {
        const next = navList[Math.min(navList.length - 1, idx + 1)];
        if (next && next !== navList[idx]) onNavigate?.(next);
      } else if (e.key === "k" || e.key === "ArrowLeft") {
        const prev = navList[Math.max(0, idx - 1)];
        if (prev && prev !== navList[idx]) onNavigate?.(prev);
      } else if (e.key === "a" && photo) {
        e.preventDefault();
        void setPhotoStatus("approved_job_board");
      } else if (e.key === "d" && photo) {
        e.preventDefault();
        void setPhotoStatus("denied");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, navList, photo]);

  const navIndex = event && navList
    ? navList.findIndex((n) => n.kind === event.kind && n.id === event.id)
    : -1;
  const hasPrev = navList ? navIndex > 0 : false;
  const hasNext = navList ? navIndex >= 0 && navIndex < navList.length - 1 : false;

  async function load() {
    if (!event) return;
    setLoading(true);
    try {
      if (event.kind === "photo") {
        const { data, error } = await supabase
          .from("photo_requests")
          .select(
            "id, first_name, last_name, email, company, team, event_name, event_location, event_date, event_end_date, spans_multiple_days, start_time, end_time, notes, status, on_site_contact_name, on_site_contact_phone, created_at, reviewed_at, reviewed_by",
          )
          .eq("id", event.id)
          .maybeSingle();
        if (error) throw error;
        const photoData = (data as PhotoDetail | null) ?? null;
        setPhoto(photoData);

        // Load roster fill (openings vs active assignments)
        if (photoData) {
          const [{ data: openings }, { data: assigns }] = await Promise.all([
            supabase.from("photo_request_openings").select("id, role").eq("request_id", photoData.id),
            supabase
              .from("photo_request_assignments")
              .select("id, opening_id")
              .eq("request_id", photoData.id)
              .is("released_at", null),
          ]);
          const total = (openings as OpeningRow[] | null)?.length ?? 0;
          const filled = (assigns as AssignmentRow[] | null)?.length ?? 0;
          setRoster({ filled, total });
        }

        // Auto-flip "New" → "Pending" the first time an admin opens the request
        if (photoData && photoData.status === "new") {
          const reviewer = user?.email ?? null;
          const { error: updErr } = await supabase
            .from("photo_requests")
            .update({
              status: "pending",
              reviewed_at: new Date().toISOString(),
              reviewed_by: reviewer,
            })
            .eq("id", photoData.id);
          if (!updErr) {
            setPhoto({ ...photoData, status: "pending", reviewed_at: new Date().toISOString(), reviewed_by: reviewer });
            onChanged?.();
          }
        }
      } else {
        const [{ data: req, error: reqErr }, { data: items, error: itemsErr }] =
          await Promise.all([
            supabase
              .from("gear_requests")
              .select("id, requestor_name, location, needed_date, notes, status")
              .eq("id", event.id)
              .maybeSingle(),
            supabase
              .from("gear_request_items")
              .select("id, gear_id")
              .eq("request_id", event.id),
          ]);
        if (reqErr) throw reqErr;
        if (itemsErr) throw itemsErr;
        setGear((req as GearDetail | null) ?? null);
        const ids = (items as GearItemRow[] | null)?.map((i) => i.gear_id) ?? [];
        if (ids.length) {
          const { data: g } = await supabase
            .from("gear")
            .select("id, name")
            .in("id", ids);
          setGearItems(((g as GearRow[] | null) ?? []).map((x) => ({ id: x.id, name: x.name })));
        } else {
          setGearItems([]);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  }

  async function setPhotoStatus(next: PhotoRequestStatus) {
    if (!photo) return;
    setSaving(true);
    const reviewer = user?.email ?? null;
    const { error } = await supabase
      .from("photo_requests")
      .update({
        status: next,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer,
      })
      .eq("id", photo.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPhoto({ ...photo, status: next, reviewed_at: new Date().toISOString(), reviewed_by: reviewer });
    toast.success(`Marked ${statusLabel(next)}`);
    onChanged?.();
  }

  async function setGearStatus(next: GearRequestStatus) {
    if (!gear) return;
    setSaving(true);
    const reviewer = user?.email ?? null;
    const { error } = await supabase
      .from("gear_requests")
      .update({
        status: next,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer,
      })
      .eq("id", gear.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setGear({ ...gear, status: next });
    toast.success(`Marked ${gearRequestStatusLabel(next)}`);
    onChanged?.();
  }

  const open = event !== null;

  // The body is rendered into either a Dialog (desktop) or Sheet (mobile).
  const body = (
    <>
      {loading ? (
        <div className="py-10 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : event?.kind === "photo" && photo ? (
        <div className="space-y-4">
          {/* Roster fill indicator pinned at top */}
          {roster && roster.total > 0 && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>Roster</span>
                  <span
                    className={cn(
                      "tabular-nums",
                      roster.filled === 0 && "text-rose-600",
                      roster.filled > 0 && roster.filled < roster.total && "text-amber-600",
                      roster.filled >= roster.total && "text-emerald-600",
                    )}
                  >
                    {roster.filled} / {roster.total} filled
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      roster.filled === 0 && "bg-rose-500",
                      roster.filled > 0 && roster.filled < roster.total && "bg-amber-500",
                      roster.filled >= roster.total && "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min(100, (roster.filled / Math.max(1, roster.total)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
            {/* Action rail (left on desktop, top on mobile) */}
            <div className="sm:w-44">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                Set status
              </div>
              <RequestActionRail
                current={photo.status}
                onSetStatus={(s) => void setPhotoStatus(s)}
                disabled={saving}
              />
              <div className="mt-2 text-[10px] text-muted-foreground hidden sm:block">
                Tip: <kbd className="px-1 rounded border bg-muted">A</kbd> approve · <kbd className="px-1 rounded border bg-muted">D</kbd> deny · <kbd className="px-1 rounded border bg-muted">J</kbd>/<kbd className="px-1 rounded border bg-muted">K</kbd> next/prev
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 text-sm min-w-0">
              <div>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full border inline-block",
                    statusBadgeClasses(photo.status),
                  )}
                >
                  {statusLabel(photo.status)}
                </span>
              </div>
              {photo.event_date && (
                <Row icon={<CalendarIcon className="size-4" />}>
                  {format(parseISO(photo.event_date), "EEEE, MMM d, yyyy")}
                  {(() => {
                    const rel = relativeDayLabel(photo.event_date);
                    return rel ? <span className="text-muted-foreground"> · {rel}</span> : null;
                  })()}
                  {photo.spans_multiple_days && photo.event_end_date &&
                    ` → ${format(parseISO(photo.event_end_date), "MMM d")}`}
                  {(photo.start_time || photo.end_time) && (
                    <span className="text-muted-foreground">
                      {" · "}
                      {photo.start_time?.slice(0, 5)}
                      {photo.end_time && ` – ${photo.end_time.slice(0, 5)}`}
                    </span>
                  )}
                </Row>
              )}
              {photo.event_location && (
                <Row icon={<MapPin className="size-4" />}>{photo.event_location}</Row>
              )}
              <Row icon={<UserIcon className="size-4" />}>
                {photo.first_name} {photo.last_name}
                <span className="text-muted-foreground"> · {photo.company}</span>
                {photo.team && <span className="text-muted-foreground"> · {photo.team}</span>}
              </Row>
              <Row icon={<UserIcon className="size-4" />}>
                <span className="flex-1">
                  {photo.first_name} {photo.last_name}
                  <span className="text-muted-foreground"> · {photo.company}</span>
                  {photo.team && <span className="text-muted-foreground"> · {photo.team}</span>}
                </span>
                <CopyButton value={`${photo.first_name} ${photo.last_name}`} label="name" />
              </Row>
              {photo.email && (
                <Row icon={<Mail className="size-4" />}>
                  <a className="flex-1 hover:underline truncate" href={`mailto:${photo.email}`}>
                    {photo.email}
                  </a>
                  <CopyButton value={photo.email} label="email" />
                </Row>
              )}
              {photo.on_site_contact_name && (
                <Row icon={<Phone className="size-4" />}>
                  <span className="flex-1">
                    {photo.on_site_contact_name}
                    {photo.on_site_contact_phone && (
                      <a className="ml-1 text-foreground hover:underline" href={`tel:${photo.on_site_contact_phone}`}>
                        {photo.on_site_contact_phone}
                      </a>
                    )}
                  </span>
                  {photo.on_site_contact_phone && (
                    <CopyButton value={photo.on_site_contact_phone} label="phone" />
                  )}
                </Row>
              )}
              {photo.notes && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                  {photo.notes}
                </div>
              )}

              <details className="group rounded-md border">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>History</span>
                  <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-3 py-3 border-t">
                  <HistoryTimeline
                    requestId={photo.id}
                    createdAt={photo.created_at}
                    reviewedAt={photo.reviewed_at}
                    reviewedBy={photo.reviewed_by}
                  />
                </div>
              </details>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/requests-photography">
                    Open full request <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
                {navList && navList.length > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={!hasPrev}
                      onClick={() => onNavigate?.(navList[navIndex - 1])}
                      title="Previous (K)"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {navIndex + 1} / {navList.length}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={!hasNext}
                      onClick={() => onNavigate?.(navList[navIndex + 1])}
                      title="Next (J)"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : event?.kind === "gear" && gear ? (
        <div className="space-y-3 text-sm">
          <div>
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full border inline-block",
                gearRequestBadgeClasses(gear.status),
              )}
            >
              {gearRequestStatusLabel(gear.status)}
            </span>
          </div>
          <Row icon={<CalendarIcon className="size-4" />}>
            {format(parseISO(gear.needed_date), "EEEE, MMM d, yyyy")}
            {(() => {
              const rel = relativeDayLabel(gear.needed_date);
              return rel ? <span className="text-muted-foreground"> · {rel}</span> : null;
            })()}
          </Row>
          <Row icon={<MapPin className="size-4" />}>{locationLabel(gear.location)}</Row>
          {gearItems.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Items ({gearItems.length})
              </div>
              <ul className="rounded-md border bg-muted/20 divide-y text-xs">
                {gearItems.map((it) => (
                  <li key={it.id} className="px-3 py-1.5">
                    {it.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gear.notes && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
              {gear.notes}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {gear.status !== "approved" && (
                <Button
                  size="sm"
                  onClick={() => setGearStatus("approved")}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="size-3.5" /> Approve
                </Button>
              )}
              {gear.status !== "denied" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGearStatus("denied")}
                  disabled={saving}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <X className="size-3.5" /> Deny
                </Button>
              )}
              {gear.status !== "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setGearStatus("pending")}
                  disabled={saving}
                >
                  Reset to pending
                </Button>
              )}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/requests-gear">
                Open full request <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Not found.
        </div>
      )}
    </>
  );

  // Title / description for the heading (works for both Dialog and Sheet)
  const headerTitle = event?.kind === "photo"
    ? (photo?.event_name || (photo ? `${photo.first_name} ${photo.last_name}` : "Photography request"))
    : (gear?.requestor_name ?? "Gear request");

  const headerKindIcon = event?.kind === "photo"
    ? <><Camera className="size-3.5" /> Photography Request</>
    : <><Wrench className="size-3.5" /> Gear Request</>;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {headerKindIcon}
            </div>
            <SheetTitle className="text-xl">{headerTitle}</SheetTitle>
            <SheetDescription className="sr-only">Request details</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {headerKindIcon}
          </div>
          <DialogTitle className="text-xl">{headerTitle}</DialogTitle>
          <DialogDescription className="sr-only">Request details</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">{children}</div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
      title={copied ? `Copied!` : `Copy ${label}`}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(`Copied ${label}`);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy to clipboard");
        }
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

