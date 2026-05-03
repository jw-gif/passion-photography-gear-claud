/**
 * Group gear by manufacturer (Canon, Sony, Nikon, etc.) detected from the
 * gear name. Falls back to "Other" when no known make is present.
 */
export type GearCategory =
  | "Canon"
  | "Sony"
  | "Nikon"
  | "Fujifilm"
  | "Panasonic"
  | "Sigma"
  | "Tamron"
  | "DJI"
  | "GoPro"
  | "Godox"
  | "Profoto"
  | "Aputure"
  | "Other";

export const GEAR_CATEGORIES: GearCategory[] = [
  "Canon",
  "Sony",
  "Nikon",
  "Fujifilm",
  "Panasonic",
  "Sigma",
  "Tamron",
  "DJI",
  "GoPro",
  "Godox",
  "Profoto",
  "Aputure",
  "Other",
];

// Order matters — first match wins. More specific patterns go before generic ones.
const MAKE_PATTERNS: Array<{ category: GearCategory; pattern: RegExp }> = [
  { category: "Canon", pattern: /\b(canon|eos|rf\s?\d|ef\s?\d|r5|r6|r3|r7|r8|5d|6d|1d|m50|c70|c100|c200|c300)\b/i },
  { category: "Sony", pattern: /\b(sony|alpha|a1|a7|a9|a6\d{3}|fx[136]|fx30|fe\s?\d|sel\d|zv-?[e1])\b/i },
  { category: "Nikon", pattern: /\b(nikon|nikkor|z[5-9]|z\s?[fF]?[c]?|d[3-8]\d{2,3}|d[1-6]|d850|d780)\b/i },
  { category: "Fujifilm", pattern: /\b(fuji|fujifilm|fujinon|x-?h\d|x-?t\d|x-?s\d|x-?pro|gfx|xf\s?\d)\b/i },
  { category: "Panasonic", pattern: /\b(panasonic|lumix|gh\d|s[15]h?|bgh\d|bs\d)\b/i },
  { category: "Sigma", pattern: /\bsigma\b/i },
  { category: "Tamron", pattern: /\btamron\b/i },
  { category: "DJI", pattern: /\b(dji|ronin|osmo|mavic|inspire|mini\s?[34]|air\s?[23s]|avata)\b/i },
  { category: "GoPro", pattern: /\b(gopro|hero\s?\d{1,2})\b/i },
  { category: "Godox", pattern: /\bgodox\b/i },
  { category: "Profoto", pattern: /\bprofoto\b/i },
  { category: "Aputure", pattern: /\b(aputure|amaran|nova\s?p\d|ls\s?[c1-9]|mc\b)\b/i },
];

export function categoryFor(_iconKind: string | null | undefined, name?: string | null): GearCategory {
  const n = name ?? "";
  for (const { category, pattern } of MAKE_PATTERNS) {
    if (pattern.test(n)) return category;
  }
  return "Other";
}
