import type { Location } from "./locations";

/**
 * Common shoot segments pulled from real Passion Photography call sheets.
 * Used as quick-pick chips in the standalone shot list generator.
 */
export const COMMON_SEGMENTS: { title: string; defaultLocation?: string }[] = [
  { title: "Pre-Gathering", defaultLocation: "Outside" },
  { title: "Worship", defaultLocation: "AUD" },
  { title: "Hosting + Giving", defaultLocation: "AUD" },
  { title: "Talk", defaultLocation: "AUD" },
  { title: "Passion Kids + bloom", defaultLocation: "Kids Room" },
  { title: "Middle School", defaultLocation: "MS Room" },
  { title: "Family Groups", defaultLocation: "Lobby" },
  { title: "One-Offs / Baptisms", defaultLocation: "AUD" },
  { title: "Editing + Uploading" },
];

/**
 * Rooms / spaces per location. These are the spaces a shoot might happen in.
 * Admins can also type custom rooms.
 */
export const LOCATION_ROOMS: Record<Location, readonly string[]> = {
  "515": ["AUD", "Lobby", "Oval", "Outside", "Backspace", "Creative Suite"],
  Cumberland: ["AUD", "Gather Space", "Lobby", "Outside", "Photo Cart"],
  Trilith: ["AUD", "Office", "Lobby", "Outside", "Photo Cart"],
};

export function getRoomsForLocation(loc: string): readonly string[] {
  return LOCATION_ROOMS[loc as Location] ?? [];
}

export const DEFAULT_GEAR_NOTES =
  "Wear all black. Two cameras preferred (24-70 + 70-200). Bring extra batteries and SD cards.";

export const DEFAULT_DETAILS_NOTES =
  "Fly-on-the-wall posture. Tight & medium framing until you get a smile, then pull wider for context.";

export const DEFAULT_EDITING_NOTES =
  "Cull tight, edit warm and natural — match Passion preset. Upload to the shared drive within 48 hours.";
