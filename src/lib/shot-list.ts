import type { PhotographerTier } from "./photographers";

export type ShotPriority = "must" | "should" | "nice";
export type SegmentRole = "all" | PhotographerTier;

export interface Shot {
  id: string;
  text: string;
  priority: ShotPriority;
}

export interface Segment {
  id: string;
  title: string;
  location?: string | null;
  time?: string | null;
  assigned_roles: SegmentRole[];
  focus?: string | null;
  shots: Shot[];
}

export interface Brief {
  call_time?: string | null;
  wrap_time?: string | null;
  door_code?: string | null;
  arrival_notes?: string | null;
  details_notes?: string | null;
  gear_notes?: string | null;
  editing_notes?: string | null;
  segments: Segment[];
  generated_with_model?: string | null;
  generation_prompt?: string | null;
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyBrief(): Brief {
  return {
    call_time: "",
    wrap_time: "",
    door_code: "",
    arrival_notes: "",
    details_notes: "",
    gear_notes: "",
    editing_notes: "",
    segments: [],
  };
}

/** Normalize anything coming back from the AI / DB into a safe Brief. */
export function normalizeBrief(input: unknown): Brief {
  const base = emptyBrief();
  if (!input || typeof input !== "object") return base;
  const b = input as Record<string, unknown>;
  const segmentsRaw = Array.isArray(b.segments) ? (b.segments as unknown[]) : [];
  const segments: Segment[] = segmentsRaw.map((s) => normalizeSegment(s));
  return {
    call_time: typeof b.call_time === "string" ? b.call_time : "",
    wrap_time: typeof b.wrap_time === "string" ? b.wrap_time : "",
    door_code: typeof b.door_code === "string" ? b.door_code : "",
    arrival_notes: typeof b.arrival_notes === "string" ? b.arrival_notes : "",
    details_notes: typeof b.details_notes === "string" ? b.details_notes : "",
    gear_notes: typeof b.gear_notes === "string" ? b.gear_notes : "",
    editing_notes: typeof b.editing_notes === "string" ? b.editing_notes : "",
    segments,
    generated_with_model:
      typeof b.generated_with_model === "string" ? b.generated_with_model : null,
    generation_prompt:
      typeof b.generation_prompt === "string" ? b.generation_prompt : null,
  };
}

function normalizeSegment(input: unknown): Segment {
  if (!input || typeof input !== "object") {
    return {
      id: makeId(),
      title: "Untitled segment",
      assigned_roles: ["all"],
      shots: [],
    };
  }
  const s = input as Record<string, unknown>;
  const rolesRaw = Array.isArray(s.assigned_roles) ? (s.assigned_roles as unknown[]) : [];
  const roles = rolesRaw
    .map((r) => (typeof r === "string" ? (r as SegmentRole) : null))
    .filter((r): r is SegmentRole => r !== null);
  const shotsRaw = Array.isArray(s.shots) ? (s.shots as unknown[]) : [];
  const shots: Shot[] = shotsRaw.map((sh) => {
    if (!sh || typeof sh !== "object") {
      return { id: makeId(), text: "", priority: "should" };
    }
    const o = sh as Record<string, unknown>;
    const priority =
      o.priority === "must" || o.priority === "should" || o.priority === "nice"
        ? (o.priority as ShotPriority)
        : "should";
    return {
      id: typeof o.id === "string" ? o.id : makeId(),
      text: typeof o.text === "string" ? o.text : "",
      priority,
    };
  });
  return {
    id: typeof s.id === "string" ? s.id : makeId(),
    title: typeof s.title === "string" ? s.title : "Untitled segment",
    location: typeof s.location === "string" ? s.location : null,
    time: typeof s.time === "string" ? s.time : null,
    assigned_roles: roles.length ? roles : ["all"],
    focus: typeof s.focus === "string" ? s.focus : null,
    shots,
  };
}

export function priorityLabel(p: ShotPriority): string {
  switch (p) {
    case "must":
      return "MUST";
    case "should":
      return "Should";
    case "nice":
      return "Nice";
  }
}

export function priorityClasses(p: ShotPriority): string {
  switch (p) {
    case "must":
      return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";
    case "should":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "nice":
      return "bg-muted text-muted-foreground border-border";
  }
}

export function roleShort(r: SegmentRole): string {
  switch (r) {
    case "all":
      return "ALL";
    case "point":
      return "POINT";
    case "door_holder":
      return "DH";
    case "training_door_holder":
      return "TDH";
  }
}

/** Render the brief as plain text in the Slack/PDF style. */
export function renderBriefAsText(brief: Brief, eventName?: string): string {
  const lines: string[] = [];
  if (eventName) {
    lines.push(`// ${eventName.toUpperCase()} //`);
    lines.push("");
  }
  const meta: string[] = [];
  if (brief.call_time) meta.push(`Call time: ${brief.call_time}`);
  if (brief.wrap_time) meta.push(`Wrap: ${brief.wrap_time}`);
  if (brief.door_code) meta.push(`Door code: ${brief.door_code}`);
  if (meta.length) {
    lines.push(meta.join("  ·  "));
    lines.push("");
  }
  if (brief.arrival_notes) {
    lines.push("ARRIVAL");
    lines.push(brief.arrival_notes);
    lines.push("");
  }
  if (brief.details_notes) {
    lines.push("DETAILS");
    lines.push(brief.details_notes);
    lines.push("");
  }
  if (brief.gear_notes) {
    lines.push("GEAR");
    lines.push(brief.gear_notes);
    lines.push("");
  }
  for (const seg of brief.segments) {
    const head = `// ${seg.title.toUpperCase()}${seg.location ? ` (${seg.location.toUpperCase()})` : ""}${seg.time ? ` — ${seg.time}` : ""} //`;
    lines.push(head);
    if (seg.assigned_roles.length) {
      lines.push(`[${seg.assigned_roles.map(roleShort).join(" / ")}]`);
    }
    if (seg.focus) lines.push(`*${seg.focus}*`);
    for (const shot of seg.shots) {
      const tag = shot.priority === "must" ? "!! " : shot.priority === "nice" ? "~ " : "• ";
      lines.push(`${tag}${shot.text}`);
    }
    lines.push("");
  }
  if (brief.editing_notes) {
    lines.push("// EDITING + UPLOADING //");
    lines.push(brief.editing_notes);
  }
  return lines.join("\n").trim() + "\n";
}

/** Render brief as Markdown. */
export function renderBriefAsMarkdown(brief: Brief, eventName?: string): string {
  const lines: string[] = [];
  if (eventName) {
    lines.push(`# ${eventName}`);
    lines.push("");
  }
  const meta: string[] = [];
  if (brief.call_time) meta.push(`**Call time:** ${brief.call_time}`);
  if (brief.wrap_time) meta.push(`**Wrap:** ${brief.wrap_time}`);
  if (brief.door_code) meta.push(`**Door code:** ${brief.door_code}`);
  if (meta.length) {
    lines.push(meta.join(" · "));
    lines.push("");
  }
  if (brief.arrival_notes) {
    lines.push("### Arrival");
    lines.push(brief.arrival_notes);
    lines.push("");
  }
  if (brief.details_notes) {
    lines.push("### Details");
    lines.push(brief.details_notes);
    lines.push("");
  }
  if (brief.gear_notes) {
    lines.push("### Gear");
    lines.push(brief.gear_notes);
    lines.push("");
  }
  for (const seg of brief.segments) {
    const titleBits = [seg.title];
    if (seg.location) titleBits.push(`(${seg.location})`);
    if (seg.time) titleBits.push(`— ${seg.time}`);
    lines.push(`## ${titleBits.join(" ")}`);
    if (seg.assigned_roles.length) {
      lines.push(`_Roles: ${seg.assigned_roles.map(roleShort).join(" / ")}_`);
    }
    if (seg.focus) lines.push(`> ${seg.focus}`);
    for (const shot of seg.shots) {
      const prefix =
        shot.priority === "must" ? "- **!!** " : shot.priority === "nice" ? "- _~_ " : "- ";
      lines.push(`${prefix}${shot.text}`);
    }
    lines.push("");
  }
  if (brief.editing_notes) {
    lines.push("## Editing + Uploading");
    lines.push(brief.editing_notes);
  }
  return lines.join("\n").trim() + "\n";
}

/**
 * Render the brief as Slack-friendly text using **double asterisks** for bold
 * (matches the user's preferred paste format), _underscores_ for italic,
 * > for blockquotes, and • bullets.
 */
export function renderBriefAsSlack(brief: Brief, eventName?: string): string {
  const lines: string[] = [];
  if (eventName) {
    lines.push(`**${eventName.toUpperCase()}**`);
    lines.push("");
  }
  const meta: string[] = [];
  if (brief.call_time) meta.push(`**Call time:** ${brief.call_time}`);
  if (brief.wrap_time) meta.push(`**Wrap:** ${brief.wrap_time}`);
  if (brief.door_code) meta.push(`**Door code:** ${brief.door_code}`);
  if (meta.length) {
    lines.push(meta.join("  ·  "));
    lines.push("");
  }
  if (brief.arrival_notes) {
    lines.push("**// ARRIVAL //**");
    lines.push(brief.arrival_notes);
    lines.push("");
  }
  if (brief.details_notes) {
    lines.push("**// DETAILS //**");
    lines.push(brief.details_notes);
    lines.push("");
  }
  if (brief.gear_notes) {
    lines.push("**// GEAR //**");
    lines.push(brief.gear_notes);
    lines.push("");
  }
  for (const seg of brief.segments) {
    const headBits = [seg.title.toUpperCase()];
    if (seg.location) headBits.push(`(${seg.location.toUpperCase()})`);
    if (seg.time) headBits.push(`— ${seg.time}`);
    lines.push(`**// ${headBits.join(" ")} //**`);
    if (seg.assigned_roles.length) {
      lines.push(`_[${seg.assigned_roles.map(roleShort).join(" / ")}]_`);
    }
    if (seg.focus) lines.push(`> _${seg.focus}_`);
    for (const shot of seg.shots) {
      const prefix =
        shot.priority === "must" ? "**‼️** " : shot.priority === "nice" ? "_~_ " : "• ";
      lines.push(`${prefix}${shot.text}`);
    }
    lines.push("");
  }
  if (brief.editing_notes) {
    lines.push("**// EDITING + UPLOADING //**");
    lines.push(brief.editing_notes);
  }
  return lines.join("\n").trim() + "\n";
}
