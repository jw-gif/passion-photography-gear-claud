import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  HelpCircle,
  LogOut,
  Mail,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import pccLogo from "@/assets/pcc-logo.png";
import { cn } from "@/lib/utils";
import { BlocksRenderer } from "@/components/onboarding-blocks-renderer";
import {
  type ChecklistItemRow,
  type DayBucket,
  type HireRow,
  type PageRow,
  type TimelineItemRow,
  buildPlan,
  checklistProgress,
  classifyMilestone,
  dayOffsetToDate,
  getInitials,
  safeBlocks,
} from "@/lib/onboarding";

interface Search {
  tab?: string;
  previewHire?: string;
}

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    previewHire: typeof s.previewHire === "string" ? s.previewHire : undefined,
  }),
  head: () => ({
    meta: [{ title: "Onboarding · Passion Staff Hub" }],
  }),
  component: OnboardingPage,
});

type TopTab = "home" | "plan" | string; // string = page slug

function OnboardingPage() {
  const { user, loading, signOut, isAdmin, displayName } = useAuth();
  const navigate = useNavigate();
  const { tab, previewHire } = Route.useSearch();
  const isPreview = Boolean(previewHire && isAdmin);

  const [pages, setPages] = useState<PageRow[]>([]);
  const [hire, setHire] = useState<HireRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineItemRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItemRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: "/onboarding" }, replace: true });
    }
  }, [loading, user, navigate]);

  async function loadAll(uid: string) {
    setLoadingData(true);

    // Kick off pages query in parallel with hire resolution
    const pagesPromise = supabase
      .from("onboarding_pages")
      .select("id, slug, title, subtitle, blocks, sort_order")
      .order("sort_order");

    let hireRow: HireRow | null = null;

    if (isPreview && previewHire) {
      const { data } = await supabase
        .from("onboarding_hires")
        .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
        .eq("id", previewHire)
        .maybeSingle();
      hireRow = (data as HireRow | null) ?? null;
    } else {
      const { data } = await supabase
        .from("onboarding_hires")
        .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
        .eq("user_id", uid)
        .maybeSingle();
      hireRow = (data as HireRow | null) ?? null;
      if (!hireRow && user?.email) {
        const { data: byEmail } = await supabase
          .from("onboarding_hires")
          .select("id, user_id, name, email, role_label, start_date, coordinator_name, archived")
          .eq("email", user.email.toLowerCase())
          .is("user_id", null)
          .maybeSingle();
        if (byEmail) {
          await supabase.from("onboarding_hires").update({ user_id: uid }).eq("id", byEmail.id);
          hireRow = { ...(byEmail as HireRow), user_id: uid };
        }
      }
    }

    const [{ data: p }, t, c] = await Promise.all([
      pagesPromise,
      hireRow
        ? supabase
            .from("onboarding_hire_timeline")
            .select("id, hire_id, day_offset, label, title, description, sort_order")
            .eq("hire_id", hireRow.id)
            .order("day_offset")
            .order("sort_order")
        : Promise.resolve({ data: [] }),
      hireRow
        ? supabase
            .from("onboarding_hire_checklist")
            .select(
              "id, hire_id, section, label, owner, completed, completed_at, sort_order, day_offset",
            )
            .eq("hire_id", hireRow.id)
            .order("sort_order")
        : Promise.resolve({ data: [] }),
    ]);

    setPages(
      ((p ?? []) as Array<Omit<PageRow, "blocks"> & { blocks: unknown }>).map((row) => ({
        ...row,
        blocks: safeBlocks(row.blocks),
      })),
    );
    setHire(hireRow);
    setTimeline((t.data ?? []) as TimelineItemRow[]);
    setChecklist((c.data ?? []) as ChecklistItemRow[]);
    setLoadingData(false);
  }

  useEffect(() => {
    if (loading) return;
    if (user) loadAll(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, previewHire, isPreview]);

  const validTabs: TopTab[] = useMemo(() => {
    const list: TopTab[] = ["home"];
    if (hire) list.push("plan");
    for (const p of pages) list.push(p.slug);
    return list;
  }, [hire, pages]);

  const activeTab: TopTab =
    tab && validTabs.includes(tab) ? (tab as TopTab) : hire ? "home" : pages[0]?.slug ?? "home";

  async function toggleChecklist(item: ChecklistItemRow) {
    if (isPreview) return;
    const completed = !item.completed;
    const { error } = await supabase
      .from("onboarding_hire_checklist")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const next = checklist.map((i) =>
      i.id === item.id
        ? {
            ...i,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          }
        : i,
    );
    setChecklist(next);
    if (completed) {
      const sectionItems = next.filter((i) => i.section === item.section);
      if (sectionItems.length > 0 && sectionItems.every((i) => i.completed)) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true,
        });
        toast.success(`${item.section} complete! 🎉`, {
          icon: <PartyPopper className="size-4" />,
        });
      }
    }
  }

  if (loading || !user) return null;

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="px-4 sm:px-6 py-4 border-b border-border bg-card/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-full bg-primary flex items-center justify-center">
              <img
                src={pccLogo}
                alt="PCC"
                className="size-5 object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">Onboarding</div>
              <div className="text-[11px] text-muted-foreground">
                {hire ? `Welcome, ${hire.name.split(" ")[0]}` : displayName ?? user.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/onboarding">Admin view</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {isPreview && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 text-xs px-4 sm:px-6 py-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <span>
              Admin preview of <strong>{hire?.name ?? "hire"}</strong>'s view. Checklist
              toggles are disabled.
            </span>
            <Link
              to="/admin/onboarding/hires/$hireId"
              params={{ hireId: previewHire ?? "" }}
              className="underline"
            >
              Back to editor
            </Link>
          </div>
        </div>
      )}

      {/* Segmented nav: Home / Your plan / Resources▾ */}
      {hire && (
        <SegmentedNav
          activeTab={activeTab}
          pages={pages}
          isPreview={isPreview}
          previewHire={previewHire}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading || loadingData ? (
          <PageSkeleton />
        ) : !hire ? (
          // No hire linked — fall back to a simple welcome list of pages
          <NoHireState
            email={user.email ?? ""}
            pages={pages}
            activeTab={activeTab}
            isPreview={isPreview}
            previewHire={previewHire}
          />
        ) : activeTab === "home" ? (
          <HomeView
            hire={hire}
            timeline={timeline}
            checklist={checklist}
            pages={pages}
            isPreview={isPreview}
            previewHire={previewHire}
            onToggleTask={toggleChecklist}
          />
        ) : activeTab === "plan" ? (
          <PlanView
            hire={hire}
            timeline={timeline}
            checklist={checklist}
            onToggleTask={toggleChecklist}
          />
        ) : (
          <PageView page={pages.find((p) => p.slug === activeTab)} />
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented nav                                                      */
/* ------------------------------------------------------------------ */

function SegmentedNav({
  activeTab,
  pages,
  isPreview,
  previewHire,
}: {
  activeTab: TopTab;
  pages: PageRow[];
  isPreview: boolean;
  previewHire: string | undefined;
}) {
  const search = (slug: string) => ({
    tab: slug,
    previewHire: isPreview ? previewHire : undefined,
  });
  const onResource = pages.some((p) => p.slug === activeTab);
  return (
    <div className="border-b border-border bg-background/80 backdrop-blur sticky top-[73px] z-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center gap-1 py-2">
          <NavPill to="home" label="Home" active={activeTab === "home"} search={search("home")} />
          <NavPill to="plan" label="Your plan" active={activeTab === "plan"} search={search("plan")} />
          {pages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border transition-colors",
                    onResource
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <BookOpen className="size-3.5" />
                  Resources
                  <ChevronDown className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {pages.map((p) => (
                  <DropdownMenuItem key={p.slug} asChild>
                    <Link
                      to="/onboarding"
                      search={search(p.slug)}
                      replace
                      className="cursor-pointer"
                    >
                      {p.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </div>
  );
}

function NavPill({
  to,
  label,
  active,
  search,
}: {
  to: string;
  label: string;
  active: boolean;
  search: Search;
}) {
  return (
    <Link
      to="/onboarding"
      search={search}
      replace
      className={cn(
        "text-sm px-3 py-1.5 rounded-full border transition-colors",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
      aria-current={active ? "page" : undefined}
      data-tab={to}
    >
      {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Home view                                                          */
/* ------------------------------------------------------------------ */

function HomeView({
  hire,
  timeline,
  checklist,
  pages,
  isPreview,
  previewHire,
  onToggleTask,
}: {
  hire: HireRow;
  timeline: TimelineItemRow[];
  checklist: ChecklistItemRow[];
  pages: PageRow[];
  isPreview: boolean;
  previewHire: string | undefined;
  onToggleTask: (item: ChecklistItemRow) => void;
}) {
  const start = new Date(`${hire.start_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayN = differenceInCalendarDays(today, start) + 1;
  const totalDays = 30;
  const progress = checklistProgress(checklist);

  const todaysEvents = timeline.filter(
    (t) => classifyMilestone(hire.start_date, t.day_offset) === "today",
  );
  const todaysTasks = checklist.filter(
    (c) =>
      c.day_offset != null &&
      !c.completed &&
      classifyMilestone(hire.start_date, c.day_offset) === "today",
  );
  const upcomingThisWeek = useMemo(() => {
    return timeline
      .filter((t) => {
        const status = classifyMilestone(hire.start_date, t.day_offset);
        if (status !== "upcoming") return false;
        const date = dayOffsetToDate(hire.start_date, t.day_offset);
        return differenceInCalendarDays(date, today) <= 7;
      })
      .slice(0, 4);
  }, [timeline, hire.start_date, today]);

  // Fallback "to-do soon" if no day-pinned tasks today: surface next 3 unchecked
  const fallbackTasks =
    todaysTasks.length === 0
      ? checklist.filter((c) => !c.completed).slice(0, 3)
      : todaysTasks;

  const dayLabel =
    dayN <= 0
      ? `Starts ${format(start, "EEE, MMM d")}`
      : dayN > totalDays
        ? `Past day ${totalDays}`
        : `Day ${Math.min(dayN, totalDays)} of ${totalDays}`;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
        <div
          className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/15 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.18em] text-primary/80 font-semibold mb-1.5">
            <Sparkles className="size-3 inline -mt-0.5 mr-1" />
            Welcome to Passion
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Hi, {hire.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            {hire.role_label ? `${hire.role_label} · ` : ""}
            {dayLabel}
            {hire.coordinator_name ? ` · with ${hire.coordinator_name}` : ""}
          </p>

          {/* Progress bar */}
          {progress.total > 0 && (
            <div className="mt-5 max-w-md">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                <span className="font-medium tabular-nums text-foreground/80">
                  {progress.done} of {progress.total} tasks done
                </span>
                <span className="tabular-nums">{progress.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Today focus */}
      <Card className="overflow-hidden">
        <div className="px-5 sm:px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Today · {format(today, "EEE, MMM d")}
            </span>
          </div>
          {dayN > 0 && dayN <= totalDays && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              Day {dayN}
            </span>
          )}
        </div>
        <div className="p-5 sm:p-6 space-y-5">
          {/* Events */}
          {todaysEvents.length > 0 ? (
            <div className="space-y-3">
              {todaysEvents.map((e) => (
                <div key={e.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                  <div>
                    <div className="font-medium leading-tight">{e.title}</div>
                    {e.description && (
                      <div className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                        {e.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No events scheduled for today — a great day to catch up.
            </div>
          )}

          {/* Tasks */}
          {fallbackTasks.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {todaysTasks.length > 0 ? "To do today" : "Up next on your list"}
              </div>
              <ul className="divide-y divide-border/60">
                {fallbackTasks.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={onToggleTask} compact />
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button asChild size="sm" variant="outline">
              <Link
                to="/onboarding"
                search={{ tab: "plan", previewHire: isPreview ? previewHire : undefined }}
                replace
              >
                Open full plan <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Coming up */}
      {upcomingThisWeek.length > 0 && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Coming up this week
            </div>
          </div>
          <ul className="space-y-2.5">
            {upcomingThisWeek.map((e) => {
              const date = dayOffsetToDate(hire.start_date, e.day_offset);
              return (
                <li key={e.id} className="flex items-baseline gap-3 text-sm">
                  <span className="text-xs text-muted-foreground tabular-nums w-20 shrink-0">
                    {format(date, "EEE, MMM d")}
                  </span>
                  <span className="font-medium">{e.title}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Help */}
      {hire.coordinator_name && (
        <Card className="p-5 sm:p-6 bg-muted/20">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
              {getInitials(hire.coordinator_name)}
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                <HelpCircle className="size-3 inline -mt-0.5 mr-1" />
                Need help?
              </div>
              <div className="text-sm">
                Reach out to{" "}
                <span className="font-medium">{hire.coordinator_name}</span> any time —
                they're here to make week one easy.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Resources grid */}
      {pages.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Resources
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {pages.map((p) => (
              <Link
                key={p.slug}
                to="/onboarding"
                search={{ tab: p.slug, previewHire: isPreview ? previewHire : undefined }}
                replace
                className="group rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors p-4 flex flex-col gap-1.5"
              >
                <BookOpen className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="text-sm font-medium leading-tight">{p.title}</div>
                {p.subtitle && (
                  <div className="text-[11px] text-muted-foreground line-clamp-2">
                    {p.subtitle}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plan view (unified day-by-day)                                     */
/* ------------------------------------------------------------------ */

type PlanFilter = "all" | "events" | "tasks";

function PlanView({
  hire,
  timeline,
  checklist,
  onToggleTask,
}: {
  hire: HireRow;
  timeline: TimelineItemRow[];
  checklist: ChecklistItemRow[];
  onToggleTask: (item: ChecklistItemRow) => void;
}) {
  const { weeks, anytimeTasks } = useMemo(
    () => buildPlan(hire, timeline, checklist),
    [hire, timeline, checklist],
  );

  const todayRef = useRef<HTMLDivElement | null>(null);
  const [showJumpToday, setShowJumpToday] = useState(false);

  function jumpToToday() {
    todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  useEffect(() => {
    const id = window.setTimeout(() => jumpToToday(), 250);
    return () => window.clearTimeout(id);
  }, [weeks.length]);

  // Show "Jump to today" button when today scrolls out of view
  useEffect(() => {
    const el = todayRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowJumpToday(!entry.isIntersecting),
      { rootMargin: "-100px 0px -100px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [weeks.length]);

  const [filter, setFilter] = useState<PlanFilter>("all");
  const [showCompleted, setShowCompleted] = useState(false);

  function dayMatchesFilter(d: DayBucket): { events: TimelineItemRow[]; tasks: ChecklistItemRow[] } {
    let events = d.events;
    let tasks = d.tasks;
    if (filter === "events") tasks = [];
    if (filter === "tasks") events = [];
    if (!showCompleted && d.isPast) {
      tasks = tasks.filter((t) => !t.completed);
    }
    return { events, tasks };
  }

  if (weeks.length === 0 && anytimeTasks.length === 0) {
    return (
      <Card className="p-10 text-center border-dashed">
        <div className="text-3xl mb-3">📋</div>
        <div className="text-sm text-muted-foreground">
          Your coordinator hasn't built your plan yet.
        </div>
        {hire.coordinator_name && (
          <div className="text-xs text-muted-foreground mt-1">
            Ping {hire.coordinator_name} to get started.
          </div>
        )}
      </Card>
    );
  }

  const currentWeekIdx = weeks.findIndex((w) => w.days.some((d) => d.isToday));
  const completedTasksCount = checklist.filter((c) => c.completed).length;
  const totalTasksCount = checklist.length;
  const overallPct =
    totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100);

  return (
    <article>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Your plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Day by day from {format(new Date(`${hire.start_date}T00:00:00`), "MMM d")} —
          events and to-dos in one place.
        </p>
        {totalTasksCount > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-xs">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedTasksCount}/{totalTasksCount} tasks · {overallPct}%
            </span>
          </div>
        )}
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-[121px] z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-5 bg-background/85 backdrop-blur border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all", label: "All" },
              { key: "events", label: "Events" },
              { key: "tasks", label: "To-dos" },
            ] as { key: PlanFilter; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                filter === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
          {completedTasksCount > 0 && (
            <button
              onClick={() => setShowCompleted((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1 ml-auto"
            >
              {showCompleted ? "Hide completed" : `Show ${completedTasksCount} completed`}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-10">
        {weeks.map((week) => {
          const isCurrent = week.weekIndex === currentWeekIdx;
          return (
            <WeekSection
              key={week.weekIndex}
              week={week}
              isCurrent={isCurrent}
              dayMatchesFilter={dayMatchesFilter}
              onToggleTask={onToggleTask}
              todayRef={todayRef}
            />
          );
        })}

        {filter !== "events" && anytimeTasks.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Anytime</h2>
              <span className="text-[11px] text-muted-foreground">No specific day</span>
            </div>
            <Card className="p-4 sm:p-5">
              <ul className="divide-y divide-border/60">
                {anytimeTasks
                  .filter((t) => showCompleted || !t.completed)
                  .map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={onToggleTask} />
                  ))}
              </ul>
            </Card>
          </section>
        )}
      </div>

      {/* Floating jump-to-today button */}
      {showJumpToday && currentWeekIdx !== -1 && (
        <button
          type="button"
          onClick={jumpToToday}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
        >
          <ArrowRight className="size-3.5 -rotate-90" />
          Today
        </button>
      )}
    </article>
  );
}

function WeekSection({
  week,
  isCurrent,
  dayMatchesFilter,
  onToggleTask,
  todayRef,
}: {
  week: ReturnType<typeof buildPlan>["weeks"][number];
  isCurrent: boolean;
  dayMatchesFilter: (d: DayBucket) => { events: TimelineItemRow[]; tasks: ChecklistItemRow[] };
  onToggleTask: (t: ChecklistItemRow) => void;
  todayRef: React.RefObject<HTMLDivElement | null>;
}) {
  const visibleDays = week.days
    .map((d) => ({ d, ...dayMatchesFilter(d) }))
    .filter((x) => x.events.length > 0 || x.tasks.length > 0);
  if (visibleDays.length === 0) return null;

  const totalEvents = visibleDays.reduce((n, x) => n + x.events.length, 0);
  const totalTasks = visibleDays.reduce((n, x) => n + x.tasks.length, 0);

  return (
    <section>
      {/* Week heading */}
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2
            className={cn(
              "text-sm font-semibold tracking-tight",
              isCurrent ? "text-foreground" : "text-foreground/80",
            )}
          >
            Week {week.weekIndex + 1}
          </h2>
          <span className="text-xs text-muted-foreground">
            {format(week.weekStart, "MMM d")} – {format(week.weekEnd, "MMM d")}
          </span>
          {isCurrent && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              This week
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {totalEvents > 0 && `${totalEvents} event${totalEvents === 1 ? "" : "s"}`}
          {totalEvents > 0 && totalTasks > 0 && " · "}
          {totalTasks > 0 && `${totalTasks} task${totalTasks === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Vertical timeline rail */}
      <div className="relative pl-10 sm:pl-14">
        <div
          className="absolute left-[18px] sm:left-[22px] top-2 bottom-2 w-px bg-border"
          aria-hidden
        />
        <div className="space-y-5">
          {visibleDays.map(({ d, events, tasks }) => (
            <DayRow
              key={d.dayOffset}
              day={d}
              events={events}
              tasks={tasks}
              onToggleTask={onToggleTask}
              todayRef={d.isToday ? todayRef : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DayRow({
  day,
  events,
  tasks,
  onToggleTask,
  todayRef,
}: {
  day: DayBucket;
  events: TimelineItemRow[];
  tasks: ChecklistItemRow[];
  onToggleTask: (t: ChecklistItemRow) => void;
  todayRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const taskDone = tasks.filter((t) => t.completed).length;
  const allDone = tasks.length > 0 && taskDone === tasks.length;

  return (
    <div ref={todayRef} className="scroll-mt-40 relative">
      {/* Date marker on rail */}
      <div
        className={cn(
          "absolute -left-10 sm:-left-14 top-0 w-9 sm:w-11 flex flex-col items-center",
        )}
      >
        <div
          className={cn(
            "size-9 sm:size-11 rounded-full border-2 flex flex-col items-center justify-center text-center leading-none transition-colors",
            day.isToday
              ? "bg-primary text-primary-foreground border-primary shadow-md"
              : day.isPast
                ? "bg-muted border-border text-muted-foreground"
                : "bg-card border-border text-foreground",
          )}
        >
          <span className="text-[8px] sm:text-[9px] uppercase font-semibold tracking-wider opacity-80">
            {format(day.date, "EEE")}
          </span>
          <span className="text-[13px] sm:text-sm font-bold tabular-nums">
            {format(day.date, "d")}
          </span>
        </div>
      </div>

      <Card
        className={cn(
          "overflow-hidden transition-all",
          day.isToday && "ring-2 ring-primary/50 shadow-md",
          day.isPast && !day.isToday && "bg-muted/30",
        )}
      >
        {/* Compact day header */}
        <div className="px-4 sm:px-5 pt-3 pb-2 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className={cn(
                "text-xs font-semibold",
                day.isToday ? "text-primary" : "text-foreground/70",
              )}
            >
              {format(day.date, "EEEE, MMMM d")}
            </span>
            {day.isToday && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                Today
              </span>
            )}
          </div>
          {tasks.length > 0 && (
            <span
              className={cn(
                "text-[10px] tabular-nums shrink-0",
                allDone ? "text-emerald-600 font-medium" : "text-muted-foreground",
              )}
            >
              {allDone ? "All done ✓" : `${taskDone}/${tasks.length}`}
            </span>
          )}
        </div>

        <div className="px-4 sm:px-5 pb-4 space-y-3">
          {/* Events */}
          {events.length > 0 && (
            <ul className="space-y-2.5">
              {events.map((e) => (
                <li key={e.id} className="flex gap-2.5">
                  <span
                    className={cn(
                      "mt-2 size-2 rounded-full shrink-0",
                      day.isToday
                        ? "bg-primary"
                        : day.isPast
                          ? "bg-muted-foreground/40"
                          : "bg-foreground/50",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "font-medium text-[15px] leading-snug",
                          day.isPast && "text-muted-foreground",
                        )}
                      >
                        {e.title}
                      </span>
                      {e.label && e.label !== "Day" && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                          {e.label}
                        </span>
                      )}
                    </div>
                    {e.description && (
                      <p
                        className={cn(
                          "text-sm mt-0.5 whitespace-pre-wrap leading-relaxed",
                          day.isPast ? "text-muted-foreground/80" : "text-foreground/75",
                        )}
                      >
                        {e.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Divider between events and tasks */}
          {events.length > 0 && tasks.length > 0 && (
            <div className="h-px bg-border/60" aria-hidden />
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <ul className="divide-y divide-border/50 -mx-1">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={onToggleTask} />
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Task row (shared)                                                  */
/* ------------------------------------------------------------------ */

function TaskRow({
  task,
  onToggle,
  compact,
}: {
  task: ChecklistItemRow;
  onToggle: (t: ChecklistItemRow) => void;
  compact?: boolean;
}) {
  return (
    <li className={cn("flex items-start gap-3", compact ? "py-2" : "py-2.5")}>
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "size-5 mt-0.5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer",
          task.completed
            ? "bg-emerald-600 border-emerald-600 text-background scale-100"
            : "border-input bg-background hover:border-primary hover:scale-105",
        )}
      >
        {task.completed && <Check className="size-3" strokeWidth={3} />}
      </button>
      <span
        className={cn(
          "text-sm flex-1 select-none cursor-pointer leading-snug",
          task.completed && "line-through text-muted-foreground",
        )}
        onClick={() => onToggle(task)}
      >
        {task.label}
        {task.section && !compact && (
          <span className="ml-2 text-[10px] text-muted-foreground/70 uppercase tracking-wider">
            · {task.section}
          </span>
        )}
      </span>
      {task.owner && <OwnerChip owner={task.owner} />}
    </li>
  );
}

function OwnerChip({ owner }: { owner: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center size-6 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">
            {getInitials(owner)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{owner}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Page (resource content)                                            */
/* ------------------------------------------------------------------ */

function PageView({ page }: { page: PageRow | undefined }) {
  if (!page) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground">Page not found.</div>
      </Card>
    );
  }
  return (
    <article>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{page.title}</h1>
        {page.subtitle && (
          <p className="text-sm text-muted-foreground mt-1.5">{page.subtitle}</p>
        )}
      </div>
      <BlocksRenderer blocks={page.blocks} />
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

function NoHireState({
  email,
  pages,
  activeTab,
  isPreview,
  previewHire,
}: {
  email: string;
  pages: PageRow[];
  activeTab: TopTab;
  isPreview: boolean;
  previewHire: string | undefined;
}) {
  const onPage = pages.find((p) => p.slug === activeTab);
  return (
    <div className="space-y-5">
      {!onPage && (
        <Card className="p-8 text-center border-dashed">
          <div className="text-3xl mb-2">👋</div>
          <div className="font-medium mb-1">You're signed in!</div>
          <div className="text-sm text-muted-foreground max-w-md mx-auto">
            We don't have a personalized plan linked to your account yet. Ask your
            coordinator to add you using the email{" "}
            <span className="font-mono">{email}</span>.
          </div>
        </Card>
      )}
      {onPage ? (
        <PageView page={onPage} />
      ) : (
        pages.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              Resources
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {pages.map((p) => (
                <Link
                  key={p.slug}
                  to="/onboarding"
                  search={{ tab: p.slug, previewHire: isPreview ? previewHire : undefined }}
                  replace
                  className="group rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors p-4 flex flex-col gap-1.5"
                >
                  <BookOpen className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-sm font-medium leading-tight">{p.title}</div>
                </Link>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}

// Suppress unused-import warning in some bundlers.
void Mail;
