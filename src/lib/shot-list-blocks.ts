/**
 * Block-and-template assembly for shot lists. No AI — admins curate the
 * blocks and templates in the database, this file fetches them and stitches
 * them into a Brief deterministically.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  type Brief,
  type Segment,
  type Shot,
  type ShotPriority,
  type SegmentRole,
  emptyBrief,
  makeId,
} from "./shot-list";

export interface LocationBlockRow {
  id: string;
  key: string;
  label: string;
  alias: string | null;
  address: string;
  arrival: string;
  editing_space: string;
  sort_order: number;
}

export interface SegmentBlockRow {
  id: string;
  key: string;
  title: string;
  default_location: string | null;
  default_roles: string[];
  focus: string | null;
  shots: Array<{ key: string; text: string; priority: ShotPriority }>;
  sort_order: number;
}

export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  location_key: string | null;
  segment_keys: string[];
  roles: string[];
  call_time: string | null;
  wrap_time: string | null;
  details_notes: string | null;
  gear_notes: string | null;
  editing_notes: string | null;
  sort_order: number;
}

function isShotPriority(v: unknown): v is ShotPriority {
  return v === "must" || v === "should" || v === "nice";
}

function normalizeShotsJson(value: unknown): SegmentBlockRow["shots"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const o = s as Record<string, unknown>;
      const text = typeof o.text === "string" ? o.text : "";
      if (!text) return null;
      return {
        key: typeof o.key === "string" ? o.key : makeId(),
        text,
        priority: isShotPriority(o.priority) ? o.priority : ("should" as ShotPriority),
      };
    })
    .filter((s): s is SegmentBlockRow["shots"][number] => s !== null);
}

export async function fetchLocationBlocks(): Promise<LocationBlockRow[]> {
  const { data, error } = await supabase
    .from("shot_list_location_blocks")
    .select("*")
    .order("sort_order")
    .order("label");
  if (error) throw error;
  return (data ?? []) as LocationBlockRow[];
}

export async function fetchSegmentBlocks(): Promise<SegmentBlockRow[]> {
  const { data, error } = await supabase
    .from("shot_list_segment_blocks")
    .select("*")
    .order("sort_order")
    .order("title");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as Omit<SegmentBlockRow, "shots">),
    shots: normalizeShotsJson((row as { shots: unknown }).shots),
  }));
}

export async function fetchTemplates(): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from("shot_list_templates")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as TemplateRow[];
}

export interface AssembleOptions {
  segmentKeys: string[];
  roles?: string[];
  callTime?: string | null;
  wrapTime?: string | null;
  doorCode?: string | null;
  focus?: string | null;
  detailsNotes?: string | null;
  gearNotes?: string | null;
  editingNotes?: string | null;
}

/**
 * Build a Brief by stitching the chosen location block + selected segments
 * from the bank. Pure function — no AI, no DB calls.
 */
export function assembleBrief(
  locationBlock: LocationBlockRow | null,
  segmentBlocks: SegmentBlockRow[],
  opts: AssembleOptions,
): Brief {
  const brief = emptyBrief();
  brief.call_time = opts.callTime ?? "";
  brief.wrap_time = opts.wrapTime ?? "";
  brief.door_code = opts.doorCode ?? "";
  brief.details_notes = opts.detailsNotes ?? "";
  brief.gear_notes = opts.gearNotes ?? "";
  brief.editing_notes = opts.editingNotes ?? "";

  // Arrival = location address + arrival prose (+ optional focus addendum)
  if (locationBlock) {
    const arrivalParts = [locationBlock.address, locationBlock.arrival]
      .map((p) => p.trim())
      .filter(Boolean);
    brief.arrival_notes = arrivalParts.join("\n\n");
    if (locationBlock.editing_space) {
      brief.editing_notes = [
        opts.editingNotes ?? "",
        `Editing Space Directions: ${locationBlock.editing_space}`,
      ]
        .map((p) => p.trim())
        .filter(Boolean)
        .join("\n\n");
    }
  }

  if (opts.focus && opts.focus.trim()) {
    brief.details_notes = [opts.focus.trim(), brief.details_notes ?? ""]
      .map((p) => p.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  // Map segment keys -> bank segments, preserving the order the caller provided
  const byKey = new Map(segmentBlocks.map((s) => [s.key, s]));
  const roles = (opts.roles ?? []) as SegmentRole[];

  brief.segments = opts.segmentKeys
    .map((key) => byKey.get(key))
    .filter((s): s is SegmentBlockRow => Boolean(s))
    .map((bank): Segment => {
      // Filter the segment's default_roles down to the roles the user wants
      // covered. If a segment is "all", keep it. If the user picked no roles,
      // keep the bank defaults so the segment still renders.
      const segRoles = (bank.default_roles as SegmentRole[]).filter((r) => {
        if (r === "all") return true;
        if (roles.length === 0) return true;
        return roles.includes(r);
      });
      const shots: Shot[] = bank.shots.map((s) => ({
        id: makeId(),
        text: s.text,
        priority: s.priority,
      }));
      return {
        id: makeId(),
        title: bank.title,
        location: bank.default_location ?? null,
        time: null,
        focus: bank.focus ?? null,
        assigned_roles: segRoles.length ? segRoles : (["all"] as SegmentRole[]),
        shots,
      };
    });

  return brief;
}
