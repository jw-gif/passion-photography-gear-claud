// Shared types and helpers for the Staff Onboarding feature.
// Block-based content is stored in onboarding_pages.blocks (JSONB array).
// Each block is one of the variants below.

export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "callout"; label?: string; text: string }
  | { type: "card"; title: string; body: string }
  | { type: "two_col"; left: { title: string; body: string }; right: { title: string; body: string } }
  | { type: "table"; title?: string; columns: string[]; rows: string[][] }
  | { type: "people"; title?: string; people: Person[] }
  | { type: "checklist_preview"; title?: string; items: string[] }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "embed"; url: string; title?: string }
  | { type: "link_list"; title?: string; links: LinkItem[] }
  | { type: "divider" }
  | { type: "accordion"; title?: string; items: AccordionItem[] };

export interface Person {
  name: string;
  role?: string;
  slack?: string;
}

export interface LinkItem {
  title: string;
  description?: string;
  url: string;
}

export interface AccordionItem {
  question: string;
  answer: string;
}

export const BLOCK_TYPE_LABELS: Record<ContentBlock["type"], string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  callout: "Callout box",
  card: "Card",
  two_col: "Two-column cards",
  table: "Table",
  people: "People list",
  checklist_preview: "Bulleted list",
  image: "Image",
  embed: "Embed (Loom / YouTube / Figma)",
  link_list: "Link list",
  divider: "Divider",
  accordion: "FAQ / Accordion",
};

export function emptyBlock(type: ContentBlock["type"]): ContentBlock {
  switch (type) {
    case "heading":
      return { type: "heading", text: "New heading" };
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "callout":
      return { type: "callout", label: "Note", text: "" };
    case "card":
      return { type: "card", title: "Card title", body: "" };
    case "two_col":
      return {
        type: "two_col",
        left: { title: "Left title", body: "" },
        right: { title: "Right title", body: "" },
      };
    case "table":
      return { type: "table", columns: ["Column 1", "Column 2"], rows: [["", ""]] };
    case "people":
      return { type: "people", people: [{ name: "", role: "", slack: "" }] };
    case "checklist_preview":
      return { type: "checklist_preview", items: [""] };
    case "image":
      return { type: "image", url: "", alt: "", caption: "" };
    case "embed":
      return { type: "embed", url: "", title: "" };
    case "link_list":
      return { type: "link_list", links: [{ title: "", description: "", url: "" }] };
    case "divider":
      return { type: "divider" };
    case "accordion":
      return { type: "accordion", items: [{ question: "", answer: "" }] };
  }
}

export function safeBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is ContentBlock => {
    if (!b || typeof b !== "object" || !("type" in b)) return false;
    const t = (b as { type: string }).type;
    return t in BLOCK_TYPE_LABELS;
  });
}

// Page metadata
export interface PageRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  blocks: ContentBlock[];
  sort_order: number;
}

// Hire
export interface HireRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role_label: string | null;
  start_date: string; // YYYY-MM-DD
  coordinator_name: string | null;
  archived: boolean;
}

// Timeline
export interface TimelineItemRow {
  id: string;
  hire_id: string;
  day_offset: number;
  label: string;
  title: string;
  description: string | null;
  sort_order: number;
}

// Checklist
export interface ChecklistItemRow {
  id: string;
  hire_id: string;
  section: string;
  label: string;
  owner: string | null;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  day_offset: number | null;
}

// Merged per-day item used by the unified plan view.
export type DayItem =
  | { kind: "event"; data: TimelineItemRow }
  | { kind: "task"; data: ChecklistItemRow };

export interface DayBucket {
  date: Date;
  dayOffset: number; // can be negative for pre-start
  weekIndex: number; // 0-based
  isToday: boolean;
  isPast: boolean;
  events: TimelineItemRow[];
  tasks: ChecklistItemRow[];
}

export interface WeekBucket {
  weekIndex: number;
  weekStart: Date;
  weekEnd: Date;
  days: DayBucket[];
  unscheduledTasks: ChecklistItemRow[]; // tasks with no day_offset, bucketed by section week if any
}

export function buildPlan(
  hire: HireRow,
  timeline: TimelineItemRow[],
  checklist: ChecklistItemRow[],
  now: Date = new Date(),
): { weeks: WeekBucket[]; anytimeTasks: ChecklistItemRow[] } {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Collect distinct day offsets that have any content
  const offsets = new Set<number>();
  for (const t of timeline) offsets.add(t.day_offset);
  for (const c of checklist) if (c.day_offset != null) offsets.add(c.day_offset);

  // Always ensure today appears if hire is in their plan window
  const startOffset = 0;
  const maxOffset = Math.max(
    ...Array.from(offsets),
    startOffset,
  );

  const sortedOffsets = Array.from(offsets).sort((a, b) => a - b);

  const dayBuckets: DayBucket[] = sortedOffsets.map((offset) => {
    const date = dayOffsetToDate(hire.start_date, offset);
    const status = classifyMilestone(hire.start_date, offset, now);
    return {
      date,
      dayOffset: offset,
      weekIndex: Math.max(0, Math.floor(offset / 7)),
      isToday: status === "today",
      isPast: status === "past",
      events: timeline
        .filter((t) => t.day_offset === offset)
        .sort((a, b) => a.sort_order - b.sort_order),
      tasks: checklist
        .filter((c) => c.day_offset === offset)
        .sort((a, b) => a.sort_order - b.sort_order),
    };
  });

  // Group days into weeks
  const weekMap = new Map<number, DayBucket[]>();
  for (const d of dayBuckets) {
    const arr = weekMap.get(d.weekIndex) ?? [];
    arr.push(d);
    weekMap.set(d.weekIndex, arr);
  }

  const anytimeTasks = checklist
    .filter((c) => c.day_offset == null)
    .sort((a, b) => a.sort_order - b.sort_order);

  const weeks: WeekBucket[] = Array.from(weekMap.keys())
    .sort((a, b) => a - b)
    .map((weekIndex) => ({
      weekIndex,
      weekStart: dayOffsetToDate(hire.start_date, weekIndex * 7),
      weekEnd: dayOffsetToDate(hire.start_date, weekIndex * 7 + 6),
      days: (weekMap.get(weekIndex) ?? []).sort((a, b) => a.dayOffset - b.dayOffset),
      unscheduledTasks: [],
    }));

  // Suppress unused-variable warning in some bundlers
  void maxOffset;

  return { weeks, anytimeTasks };
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

// Templates
export interface TemplateChecklistItem {
  section: string;
  label: string;
  owner?: string | null;
}
export interface TemplateTimelineItem {
  day_offset: number;
  label: string;
  title: string;
  description?: string | null;
}
export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  checklist: TemplateChecklistItem[];
  timeline: TemplateTimelineItem[];
  sort_order: number;
}

export function safeTemplateChecklist(raw: unknown): TemplateChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => ({
      section: typeof i.section === "string" ? i.section : "General",
      label: typeof i.label === "string" ? i.label : "",
      owner: typeof i.owner === "string" ? i.owner : null,
    }));
}

export function safeTemplateTimeline(raw: unknown): TemplateTimelineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => ({
      day_offset: typeof i.day_offset === "number" ? i.day_offset : 0,
      label: typeof i.label === "string" ? i.label : "Day",
      title: typeof i.title === "string" ? i.title : "",
      description: typeof i.description === "string" ? i.description : null,
    }));
}

// Helpers for the dynamic timeline view.
export type MilestoneStatus = "past" | "today" | "upcoming";

export function classifyMilestone(
  startDateISO: string,
  dayOffset: number,
  now: Date = new Date(),
): MilestoneStatus {
  const start = new Date(`${startDateISO}T00:00:00`);
  const target = new Date(start);
  target.setDate(target.getDate() + dayOffset);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (target.getTime() < today.getTime()) return "past";
  if (target.getTime() === today.getTime()) return "today";
  return "upcoming";
}

export function dayOffsetToDate(startDateISO: string, dayOffset: number): Date {
  const d = new Date(`${startDateISO}T00:00:00`);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

export function dateToDayOffset(startDateISO: string, dateISO: string): number {
  const start = new Date(`${startDateISO}T00:00:00`).getTime();
  const target = new Date(`${dateISO}T00:00:00`).getTime();
  return Math.round((target - start) / (1000 * 60 * 60 * 24));
}

export function checklistProgress(items: ChecklistItemRow[]): { done: number; total: number; pct: number } {
  const total = items.length;
  const done = items.filter((i) => i.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

// Render a small subset of markdown as HTML: **bold**, *italic*, [text](url), `code`.
// Used by the renderer for paragraph/callout/card/accordion bodies.
export function renderInlineMarkdown(input: string): string {
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`\n]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-xs">$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="underline text-primary hover:opacity-80">$1</a>',
    );
}
