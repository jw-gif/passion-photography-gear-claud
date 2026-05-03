export type PhotographerTier = "point" | "door_holder" | "training_door_holder";

export const PHOTOGRAPHER_TIERS: { value: PhotographerTier; label: string; short: string }[] = [
  { value: "point", label: "Point", short: "Point" },
  { value: "door_holder", label: "Door Holder", short: "Door Holder" },
  { value: "training_door_holder", label: "Training Door Holder", short: "Training" },
];

export function tierLabel(t: PhotographerTier): string {
  return PHOTOGRAPHER_TIERS.find((x) => x.value === t)?.label ?? t;
}

export function tierBadgeClasses(t: PhotographerTier): string {
  switch (t) {
    case "point":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "door_holder":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
    case "training_door_holder":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  }
}

export function tierRank(t: PhotographerTier): number {
  switch (t) {
    case "point":
      return 3;
    case "door_holder":
      return 2;
    case "training_door_holder":
      return 1;
  }
}

export function isPaidRole(t: PhotographerTier): boolean {
  return t === "point";
}

/**
 * Generate a URL-safe random token for a photographer's personal link.
 * Uses Web Crypto so it works in browser + Worker environments.
 */
export function generatePhotographerToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  // base64url
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function formatBudget(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function parseBudgetInputToCents(input: string): number | null {
  const trimmed = input.trim().replace(/[$,]/g, "");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
