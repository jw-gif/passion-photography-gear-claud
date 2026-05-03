import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { LOCATIONS, locationLabel } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { GearIcon } from "@/lib/gear-icons";
import { GEAR_CATEGORIES, categoryFor, type GearCategory } from "@/lib/gear-categories";
import pccLogo from "@/assets/pcc-logo.png";
import {
  Calendar as CalendarIcon,
  Check,
  Search,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShoppingCart,
  UserSearch,
  Camera,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface GearRow {
  id: string;
  name: string;
  icon_kind: string | null;
  status: "active" | "out_of_service" | "out_for_repair";
}

interface ConflictMap {
  // gear id -> list of YYYY-MM-DD dates already requested
  [gearId: string]: string[];
}

export function GearRequestForm() {
  const [gear, setGear] = useState<GearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GearCategory | "All">("All");
  const [selectedGear, setSelectedGear] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<ConflictMap>({});
  const [recentlyRequested, setRecentlyRequested] = useState<GearRow[]>([]);

  const [name, setName] = useState("");
  const [location, setLocation] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  // Load all active, requestable gear once.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("gear")
        .select("id, name, icon_kind, status")
        .eq("status", "active")
        .eq("requestable", true)
        .order("name", { ascending: true });
      setGear((data || []) as GearRow[]);
      setLoading(false);
    })();
  }, []);

  // Pull a tiny conflict map: which gear is already requested for which dates.
  useEffect(() => {
    void (async () => {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 30);
      const to = new Date(today);
      to.setDate(today.getDate() + 90);
      const { data } = await supabase.rpc("get_gear_conflicts", {
        _from: format(from, "yyyy-MM-dd"),
        _to: format(to, "yyyy-MM-dd"),
      });
      const map: ConflictMap = {};
      for (const row of (data ?? []) as Array<{ gear_id: string; needed_date: string }>) {
        if (!map[row.gear_id]) map[row.gear_id] = [];
        map[row.gear_id].push(row.needed_date);
      }
      setConflicts(map);
    })();
  }, []);

  // After the requester enters a name, surface their last 5 unique gear items
  useEffect(() => {
    const requestor = name.trim();
    if (!requestor || gear.length === 0) {
      setRecentlyRequested([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.rpc("get_recent_gear_for_requestor", {
        _name: requestor,
        _limit: 5,
      });
      if (cancelled) return;
      const ids = ((data ?? []) as Array<{ gear_id: string }>).map((r) => r.gear_id);
      setRecentlyRequested(ids.map((id) => gear.find((g) => g.id === id)).filter(Boolean) as GearRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [name, gear]);

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;

  const filteredGear = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gear.filter((g) => {
      const cat = categoryFor(g.icon_kind, g.name);
      if (activeCategory !== "All" && cat !== activeCategory) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [gear, query, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: gear.length };
    for (const cat of GEAR_CATEGORIES) counts[cat] = 0;
    for (const g of gear) {
      counts[categoryFor(g.icon_kind, g.name)]++;
    }
    return counts;
  }, [gear]);

  function isConflicting(gearId: string): boolean {
    if (!dateKey) return false;
    return (conflicts[gearId] ?? []).includes(dateKey);
  }

  function toggleGear(id: string) {
    setSelectedGear((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setErrors((e) => ({ ...e, gear: "" }));
  }

  const selectedItems = useMemo(
    () => gear.filter((g) => selectedGear.has(g.id)),
    [gear, selectedGear],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const requestor = name.trim();
    const newErrors: Record<string, string> = {};
    if (!requestor) newErrors.name = "Please enter your name";
    if (selectedGear.size === 0) newErrors.gear = "Please select at least one gear item";
    if (!location) newErrors.location = "Please select a location";
    if (!date) newErrors.date = "Please pick a date";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) {
      toast.error("Missing a few details", {
        description: Object.values(newErrors).join(" · "),
      });
      return;
    }

    setSubmitting(true);
    const { data: req, error: reqErr } = await supabase
      .from("gear_requests")
      .insert({
        requestor_name: requestor,
        location: location,
        needed_date: format(date!, "yyyy-MM-dd"),
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (reqErr || !req) {
      toast.error("Couldn't submit request", { description: reqErr?.message });
      setSubmitting(false);
      return;
    }

    const items = Array.from(selectedGear).map((gid) => ({
      request_id: req.id,
      gear_id: gid,
    }));
    const { error: itemsErr } = await supabase.from("gear_request_items").insert(items);
    if (itemsErr) {
      toast.error("Request submitted but gear list failed to save", { description: itemsErr.message });
    }

    setSubmitting(false);
    setSuccess(true);
    toast.success("Request submitted!");
    setSelectedGear(new Set());
    setNotes("");
    setDate(undefined);
    setLocation("");
    setQuery("");
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="size-14 rounded-full bg-loc-trilith/15 mx-auto flex items-center justify-center">
            <Check className="size-7 text-loc-trilith" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Request submitted</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Thanks {name.split(" ")[0] || "!"} — an admin will review your request shortly.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => setSuccess(false)} size="lg">Submit another request</Button>
          </div>
        </Card>
      </main>
    );
  }

  const hasConflictsInCart = selectedItems.some((g) => isConflicting(g.id));

  return (
    <main className="min-h-screen pb-32 lg:pb-12">
      <header className="px-4 sm:px-6 py-4 border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center relative overflow-hidden">
              <img
                src={pccLogo}
                alt="PCC"
                className="size-5 object-contain transition-opacity duration-200 group-hover:opacity-0"
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <ArrowLeft className="size-4 text-primary-foreground absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-tight">Request Gear</div>
              <div className="text-xs text-muted-foreground">Passion Photography Hub</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/request-photography">
                <Camera className="size-4" />
                <span className="hidden sm:inline">Request Photography</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/photographer-link">
                <UserSearch className="size-4" />
                <span className="hidden sm:inline">Find My Serving Opportunities</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Request gear</h1>
          <p className="mt-2 text-muted-foreground">
            Tell us what you need, where, and when — we'll get it ready for you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: form */}
          <div className="space-y-6 min-w-0">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">1 · Who are you?</p>
              <Card className="p-5">
              <label className="text-sm font-semibold block mb-3" htmlFor="requestor-name">
                Your name <span className="text-destructive">*</span>
              </label>
              <Input
                id="requestor-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((er) => ({ ...er, name: "" }));
                }}
                placeholder="Enter your name"
                maxLength={50}
              />
              {errors.name && <p className="text-destructive text-sm mt-2">{errors.name}</p>}
            </Card>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">2 · When and where?</p>
            <Card className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-semibold block mb-3">
                  Location <span className="text-destructive">*</span>
                </label>
                <Select
                  value={location}
                  onValueChange={(v) => {
                    setLocation(v);
                    setErrors((e) => ({ ...e, location: "" }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>{locationLabel(loc)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location && <p className="text-destructive text-sm mt-2">{errors.location}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold block mb-3">
                  Date needed <span className="text-destructive">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="size-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        setDate(d);
                        setErrors((e) => ({ ...e, date: "" }));
                      }}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && <p className="text-destructive text-sm mt-2">{errors.date}</p>}
              </div>
            </Card>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">3 · What do you need?</p>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3 gap-3">
                <label className="text-sm font-semibold">
                  Gear needed <span className="text-destructive">*</span>
                </label>
                {selectedGear.size > 0 && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                    {selectedGear.size} selected
                  </span>
                )}
              </div>

              {recentlyRequested.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1">
                    <Sparkles className="size-3" /> You've recently requested
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentlyRequested.map((g) => {
                      const checked = selectedGear.has(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleGear(g.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium border rounded-full pl-2 pr-3 py-1 transition-colors",
                            checked
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 hover:bg-muted",
                          )}
                        >
                          {checked ? <Check className="size-3" /> : <span className="size-3" />}
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Tabs
                value={activeCategory}
                onValueChange={(v) => setActiveCategory(v as GearCategory | "All")}
                className="mb-3"
              >
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1">
                  <TabsTrigger value="All" className="text-xs">
                    All <span className="ml-1 text-muted-foreground">({categoryCounts.All})</span>
                  </TabsTrigger>
                  {GEAR_CATEGORIES.map((cat) => {
                    const count = categoryCounts[cat] ?? 0;
                    if (count === 0) return null;
                    return (
                      <TabsTrigger key={cat} value={cat} className="text-xs">
                        {cat} <span className="ml-1 text-muted-foreground">({count})</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              <div className="relative mb-3">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search gear…"
                  className="pl-9"
                />
              </div>

              {loading ? (
                <div className="text-sm text-muted-foreground py-6 text-center">Loading gear…</div>
              ) : filteredGear.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No gear matches.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[28rem] overflow-y-auto pr-1">
                  {filteredGear.map((g) => {
                    const checked = selectedGear.has(g.id);
                    const conflict = isConflicting(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGear(g.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors border-2",
                          checked
                            ? "bg-primary/5 border-primary/40"
                            : "border-transparent hover:bg-muted/60 border-border/40",
                        )}
                      >
                        <div
                          className={cn(
                            "size-4 rounded border-2 inline-flex items-center justify-center shrink-0",
                            checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40",
                          )}
                        >
                          {checked && <Check className="size-3" />}
                        </div>
                        <GearIcon name={g.name} iconKind={g.icon_kind} className="size-5 text-foreground/70 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{g.name}</div>
                          {date && (
                            <div className="text-xs flex items-center gap-1 mt-0.5">
                              {conflict ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                  <AlertTriangle className="size-3" /> Already requested for this date
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="size-3" /> Available
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.gear && <p className="text-destructive text-sm mt-2">{errors.gear}</p>}
            </Card>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">4 · Anything else?</p>
            <Card className="p-5">
              <label className="text-sm font-semibold block mb-2" htmlFor="notes">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else we should know?"
                maxLength={500}
                rows={3}
              />
            </Card>
            </div>

            {/* Mobile submit (cart sticks at bottom) */}
            <div className="lg:hidden">
              <Button ref={submitRef} type="submit" size="lg" disabled={submitting} className="w-full">
                <Send className="size-4" />
                {submitting ? "Submitting…" : `Submit request${selectedGear.size > 0 ? ` (${selectedGear.size})` : ""}`}
              </Button>
            </div>
          </div>

          {/* Right: sticky cart (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold">
                    <ShoppingCart className="size-4" /> Your cart
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedGear.size} item{selectedGear.size === 1 ? "" : "s"}</span>
                </div>

                {selectedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Pick gear from the list to add it here.
                  </p>
                ) : (
                  <ul className="space-y-1.5 max-h-80 overflow-y-auto -mx-1 px-1">
                    {selectedItems.map((g) => (
                      <li
                        key={g.id}
                        className="flex items-center gap-2 text-sm bg-muted/40 rounded-md px-2 py-1.5"
                      >
                        <GearIcon name={g.name} iconKind={g.icon_kind} className="size-4 text-foreground/70 shrink-0" />
                        <span className="flex-1 min-w-0 truncate">{g.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${g.name}`}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => toggleGear(g.id)}
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {hasConflictsInCart && (
                  <div className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                    <span>One or more items already have a request for this date. Admins will resolve conflicts on review.</span>
                  </div>
                )}

                <div className="border-t mt-4 pt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Location</span>
                    <span className="font-medium text-foreground">{location ? locationLabel(location) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Date</span>
                    <span className="font-medium text-foreground">{date ? format(date, "MMM d, yyyy") : "—"}</span>
                  </div>
                </div>

                <Button type="submit" size="lg" disabled={submitting} className="w-full mt-4">
                  <Send className="size-4" />
                  {submitting ? "Submitting…" : "Submit request"}
                </Button>
              </Card>
            </div>
          </aside>
        </form>
      </div>

      {/* Mobile sticky cart summary */}
      {selectedGear.size > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border px-4 py-3 z-30">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold flex items-center gap-1.5">
                <ShoppingCart className="size-4" />
                {selectedGear.size} item{selectedGear.size === 1 ? "" : "s"} in cart
              </div>
              {date && <div className="text-xs text-muted-foreground">For {format(date, "MMM d")}</div>}
            </div>
            <Button type="button" size="sm" onClick={() => submitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              Review &amp; submit
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
