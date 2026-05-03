import { cn } from "@/lib/utils";

/**
 * All available icon kinds. The order here drives the icon picker UI.
 */
export const ICON_KINDS = [
  "telephoto",
  "standard-zoom",
  "wide-zoom",
  "prime",
  "wide-prime",
  "body",
  "flash",
  "strobe",
] as const;

export type IconKind = (typeof ICON_KINDS)[number];

export const ICON_LABELS: Record<IconKind, string> = {
  telephoto: "Telephoto lens",
  "standard-zoom": "Standard zoom",
  "wide-zoom": "Wide zoom",
  prime: "Prime lens",
  "wide-prime": "Wide prime",
  body: "Camera body",
  flash: "Speedlight",
  strobe: "Studio strobe",
};

/**
 * Auto-detect an icon kind from a gear name when no manual override is set.
 * Order matters: more specific keywords come first.
 */
export function autoIconKindFor(name: string): IconKind {
  const n = name.toLowerCase();
  if (n.includes("b10")) return "strobe";
  if (n.includes("a10") || n.includes("speedlight") || n.includes("flash"))
    return "flash";
  if (n.includes("r5") || n.includes("r6") || n.includes("body")) return "body";
  if (n.includes("70-200") || n.includes("70 200")) return "telephoto";
  if (n.includes("14mm") || n.includes("14 mm")) return "wide-prime";
  if (n.includes("16-35") || n.includes("14-24")) return "wide-zoom";
  if (n.includes("24-105") || n.includes("24-70") || n.includes("zoom"))
    return "standard-zoom";
  if (n.includes("35mm") || n.includes("85mm") || n.includes("50mm") || n.includes("prime"))
    return "prime";
  return "body";
}

interface SvgProps {
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Vertical lens icons — front element at top, mount at bottom        */
/* All lenses use viewBox 0 0 24 32 for a tall portrait silhouette.    */
/* ------------------------------------------------------------------ */

function TelephotoSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* lens hood (slightly flared) */}
      <path d="M5 2h14l-1 3H6z" />
      {/* front element circle */}
      <circle cx="12" cy="6.5" r="3.2" />
      <circle cx="12" cy="6.5" r="1.6" strokeOpacity="0.55" />
      {/* main barrel */}
      <path d="M5.5 5h13v20.5h-13z" />
      {/* zoom ring (textured) */}
      <line x1="5.5" y1="11" x2="18.5" y2="11" />
      <line x1="5.5" y1="14.5" x2="18.5" y2="14.5" />
      <line x1="7.5" y1="11.5" x2="7.5" y2="14" strokeOpacity="0.55" />
      <line x1="10" y1="11.5" x2="10" y2="14" strokeOpacity="0.55" />
      <line x1="12.5" y1="11.5" x2="12.5" y2="14" strokeOpacity="0.55" />
      <line x1="15" y1="11.5" x2="15" y2="14" strokeOpacity="0.55" />
      {/* focus ring */}
      <line x1="5.5" y1="20" x2="18.5" y2="20" />
      <line x1="5.5" y1="22.5" x2="18.5" y2="22.5" />
      {/* distance window */}
      <rect x="9.5" y="16" width="5" height="2.5" rx="0.4" strokeOpacity="0.7" />
      {/* mount flange */}
      <path d="M4 25.5h16v2.5H4z" />
      {/* mount base + tripod foot */}
      <path d="M7 28h10v2H7z" />
      <line x1="12" y1="30" x2="12" y2="31.5" />
    </svg>
  );
}

function StandardZoomSvg({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* hood */}
      <path d="M6 3h12l-0.8 2.5H6.8z" />
      {/* front element */}
      <circle cx="12" cy="7" r="2.8" />
      <circle cx="12" cy="7" r="1.3" strokeOpacity="0.55" />
      {/* barrel */}
      <path d="M6.5 5.5h11v17h-11z" />
      {/* zoom ring */}
      <line x1="6.5" y1="11" x2="17.5" y2="11" />
      <line x1="6.5" y1="13.5" x2="17.5" y2="13.5" />
      <line x1="9" y1="11.5" x2="9" y2="13" strokeOpacity="0.55" />
      <line x1="12" y1="11.5" x2="12" y2="13" strokeOpacity="0.55" />
      <line x1="15" y1="11.5" x2="15" y2="13" strokeOpacity="0.55" />
      {/* distance window */}
      <rect x="9.5" y="15" width="5" height="2" rx="0.4" strokeOpacity="0.7" />
      {/* focus ring */}
      <line x1="6.5" y1="19" x2="17.5" y2="19" />
      {/* mount flange */}
      <path d="M5 22.5h14v2.5H5z" />
      {/* electronic contacts */}
      <line x1="8" y1="26.5" x2="8" y2="27.5" strokeOpacity="0.6" />
      <line x1="10" y1="26.5" x2="10" y2="27.5" strokeOpacity="0.6" />
      <line x1="12" y1="26.5" x2="12" y2="27.5" strokeOpacity="0.6" />
      <line x1="14" y1="26.5" x2="14" y2="27.5" strokeOpacity="0.6" />
      <line x1="16" y1="26.5" x2="16" y2="27.5" strokeOpacity="0.6" />
      {/* mount lug */}
      <path d="M8 25h8v3H8z" />
    </svg>
  );
}

function WideZoomSvg({ className }: SvgProps) {
  // Slightly bulbous front element, shorter than telephoto, wider than standard
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* petal hood outline */}
      <path d="M4 4c1.5-1 5-1.8 8-1.8s6.5 0.8 8 1.8l-1 2.5H5z" />
      {/* bulged front element */}
      <path d="M4.8 6.2c1.5 1.4 4 2.3 7.2 2.3s5.7-0.9 7.2-2.3l-0.5 2H5.3z" />
      <circle cx="12" cy="7" r="2.5" strokeOpacity="0.5" />
      {/* barrel */}
      <path d="M6 8.2h12v14.3H6z" />
      {/* zoom ring */}
      <line x1="6" y1="12.5" x2="18" y2="12.5" />
      <line x1="6" y1="15" x2="18" y2="15" />
      <line x1="9" y1="13" x2="9" y2="14.5" strokeOpacity="0.55" />
      <line x1="12" y1="13" x2="12" y2="14.5" strokeOpacity="0.55" />
      <line x1="15" y1="13" x2="15" y2="14.5" strokeOpacity="0.55" />
      {/* focus ring */}
      <line x1="6" y1="19" x2="18" y2="19" />
      {/* mount */}
      <path d="M5 22.5h14v2.5H5z" />
      <path d="M8 25h8v3H8z" />
      <line x1="9" y1="28" x2="9" y2="29.5" strokeOpacity="0.6" />
      <line x1="12" y1="28" x2="12" y2="29.5" strokeOpacity="0.6" />
      <line x1="15" y1="28" x2="15" y2="29.5" strokeOpacity="0.6" />
    </svg>
  );
}

function PrimeSvg({ className }: SvgProps) {
  // Short stout prime barrel, vertical
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* hood */}
      <path d="M7 5h10l-0.7 2H7.7z" />
      {/* front element */}
      <circle cx="12" cy="8.5" r="2.6" />
      <circle cx="12" cy="8.5" r="1.2" strokeOpacity="0.55" />
      {/* barrel — wider than zooms */}
      <path d="M6 7h12v15H6z" />
      {/* aperture ring */}
      <line x1="6" y1="12.5" x2="18" y2="12.5" />
      {/* aperture marks */}
      <line x1="8" y1="11.5" x2="8" y2="12" strokeOpacity="0.6" />
      <line x1="10" y1="11.5" x2="10" y2="12" strokeOpacity="0.6" />
      <line x1="12" y1="11.5" x2="12" y2="12" strokeOpacity="0.6" />
      <line x1="14" y1="11.5" x2="14" y2="12" strokeOpacity="0.6" />
      <line x1="16" y1="11.5" x2="16" y2="12" strokeOpacity="0.6" />
      {/* distance window */}
      <rect x="9.5" y="14" width="5" height="2" rx="0.4" strokeOpacity="0.7" />
      {/* focus ring */}
      <line x1="6" y1="18" x2="18" y2="18" />
      {/* mount */}
      <path d="M5 22h14v2.5H5z" />
      <path d="M8 24.5h8v3H8z" />
      {/* contacts */}
      <line x1="9" y1="27.5" x2="9" y2="29" strokeOpacity="0.6" />
      <line x1="12" y1="27.5" x2="12" y2="29" strokeOpacity="0.6" />
      <line x1="15" y1="27.5" x2="15" y2="29" strokeOpacity="0.6" />
    </svg>
  );
}

function WidePrimeSvg({ className }: SvgProps) {
  // Pronounced bulbous front element (think 14mm f/1.8) — non-removable hood petals
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* fixed petal hood */}
      <path d="M3 6c2-2 4.5-3 9-3s7 1 9 3l-2 3.5H5z" />
      <line x1="6.5" y1="3.8" x2="7" y2="6" strokeOpacity="0.55" />
      <line x1="12" y1="3" x2="12" y2="5.8" strokeOpacity="0.55" />
      <line x1="17.5" y1="3.8" x2="17" y2="6" strokeOpacity="0.55" />
      {/* big bulbous element */}
      <path d="M4 9.5c1.5 2 4.5 3.5 8 3.5s6.5-1.5 8-3.5L19 12H5z" />
      <ellipse cx="12" cy="10" rx="4" ry="1.5" strokeOpacity="0.5" />
      {/* barrel */}
      <path d="M6 12h12v10.5H6z" />
      {/* aperture ring */}
      <line x1="6" y1="15" x2="18" y2="15" />
      {/* focus ring */}
      <line x1="6" y1="19" x2="18" y2="19" />
      <line x1="8" y1="16" x2="8" y2="18" strokeOpacity="0.55" />
      <line x1="10" y1="16" x2="10" y2="18" strokeOpacity="0.55" />
      <line x1="12" y1="16" x2="12" y2="18" strokeOpacity="0.55" />
      <line x1="14" y1="16" x2="14" y2="18" strokeOpacity="0.55" />
      <line x1="16" y1="16" x2="16" y2="18" strokeOpacity="0.55" />
      {/* mount */}
      <path d="M5 22.5h14v2.5H5z" />
      <path d="M8 25h8v3H8z" />
      <line x1="10" y1="28" x2="10" y2="29.5" strokeOpacity="0.6" />
      <line x1="14" y1="28" x2="14" y2="29.5" strokeOpacity="0.6" />
    </svg>
  );
}

function BodySvg({ className }: SvgProps) {
  // Mirrorless body — pentaprism hump on top, sculpted grip on right
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* hot shoe */}
      <path d="M10 3.5h4v1.5h-4z" />
      {/* viewfinder hump */}
      <path d="M9 5h6l1 2H8z" />
      {/* main body — asymmetric with grip on right */}
      <path d="M2.5 7h6l0.5-0.5h6l0.5 0.5h4.5a1 1 0 011 1v3l1 1v3l-1 1v3a1 1 0 01-1 1H2.5a1 1 0 01-1-1V8a1 1 0 011-1z" />
      {/* lens mount outer */}
      <circle cx="10" cy="14" r="3.8" />
      {/* lens mount inner (sensor opening) */}
      <circle cx="10" cy="14" r="2.2" strokeOpacity="0.55" />
      {/* lens release button */}
      <circle cx="14.6" cy="14" r="0.6" strokeOpacity="0.7" />
      {/* shutter button on top of grip */}
      <circle cx="19" cy="7.8" r="0.7" strokeOpacity="0.8" />
      {/* mode dial */}
      <circle cx="6" cy="7.5" r="1" strokeOpacity="0.7" />
      {/* AF assist / red eye lamp */}
      <circle cx="3.5" cy="9.5" r="0.5" strokeOpacity="0.6" />
      {/* grip indent */}
      <path d="M21.5 11.5v3" strokeOpacity="0.7" />
    </svg>
  );
}

function FlashSvg({ className }: SvgProps) {
  // Speedlight: rectangular tilting head, bounce card hint, hot-shoe foot with contacts
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* bounce card slot */}
      <line x1="9" y1="2" x2="15" y2="2" strokeOpacity="0.6" />
      {/* flash head with rounded top */}
      <path d="M6 3.5a1.5 1.5 0 011.5-1.5h9A1.5 1.5 0 0118 3.5V13H6z" />
      {/* fresnel front panel */}
      <rect x="7.5" y="5" width="9" height="6" rx="0.5" />
      <line x1="7.5" y1="7" x2="16.5" y2="7" strokeOpacity="0.55" />
      <line x1="7.5" y1="9" x2="16.5" y2="9" strokeOpacity="0.55" />
      {/* AF assist beam grid */}
      <rect x="9" y="11.5" width="6" height="1.2" strokeOpacity="0.6" />
      {/* tilt joint */}
      <circle cx="12" cy="14.5" r="1.2" strokeOpacity="0.7" />
      {/* control body with screen */}
      <path d="M5 15.5h14v9H5z" />
      {/* LCD */}
      <rect x="7" y="17" width="10" height="3.5" rx="0.4" strokeOpacity="0.7" />
      {/* control buttons */}
      <circle cx="9" cy="22.5" r="0.6" strokeOpacity="0.6" />
      <circle cx="12" cy="22.5" r="0.6" strokeOpacity="0.6" />
      <circle cx="15" cy="22.5" r="0.6" strokeOpacity="0.6" />
      {/* hot-shoe foot */}
      <path d="M8 24.5h8v3H8z" />
      {/* shoe contacts */}
      <line x1="10" y1="27.5" x2="10" y2="29" strokeOpacity="0.7" />
      <line x1="12" y1="27.5" x2="12" y2="29" strokeOpacity="0.7" />
      <line x1="14" y1="27.5" x2="14" y2="29" strokeOpacity="0.7" />
      {/* locking foot bottom */}
      <path d="M9 29h6v1H9z" />
    </svg>
  );
}

function StrobeSvg({ className }: SvgProps) {
  // Studio strobe (Profoto B10 style): cylindrical body, modeling lamp circle, control panel
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* mount ring (Bowens / Profoto) */}
      <path d="M5 3h14v2H5z" />
      <line x1="7" y1="3" x2="7" y2="2" strokeOpacity="0.6" />
      <line x1="12" y1="3" x2="12" y2="2" strokeOpacity="0.6" />
      <line x1="17" y1="3" x2="17" y2="2" strokeOpacity="0.6" />
      {/* glass dome / front */}
      <path d="M5 5h14v3H5z" />
      <ellipse cx="12" cy="6.5" rx="5" ry="1.2" strokeOpacity="0.5" />
      {/* flash tube ring (modeling lamp) */}
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="2" strokeOpacity="0.55" />
      {/* main cylindrical body */}
      <path d="M5 8h14v17H5z" />
      {/* control panel section */}
      <path d="M6.5 16.5h11v6h-11z" />
      {/* LCD */}
      <rect x="8" y="17.5" width="8" height="2.5" rx="0.3" strokeOpacity="0.7" />
      {/* knobs */}
      <circle cx="9" cy="21.5" r="0.7" strokeOpacity="0.7" />
      <circle cx="12" cy="21.5" r="0.7" strokeOpacity="0.7" />
      <circle cx="15" cy="21.5" r="0.7" strokeOpacity="0.7" />
      {/* yoke / mounting bracket */}
      <path d="M5 23h-1.5v3" />
      <path d="M19 23h1.5v3" />
      {/* stand spigot */}
      <path d="M10.5 25h3v3h-3z" />
      <line x1="12" y1="28" x2="12" y2="30.5" />
      <path d="M10 30.5h4" />
    </svg>
  );
}

const ICON_MAP: Record<IconKind, React.FC<SvgProps>> = {
  telephoto: TelephotoSvg,
  "standard-zoom": StandardZoomSvg,
  "wide-zoom": WideZoomSvg,
  prime: PrimeSvg,
  "wide-prime": WidePrimeSvg,
  body: BodySvg,
  flash: FlashSvg,
  strobe: StrobeSvg,
};

export interface GearIconProps {
  name: string;
  /** Optional manual override. Falls back to auto-detection from name. */
  iconKind?: string | null;
  className?: string;
}

function resolveKind(iconKind: string | null | undefined, name: string): IconKind {
  if (iconKind && (ICON_KINDS as readonly string[]).includes(iconKind)) {
    return iconKind as IconKind;
  }
  return autoIconKindFor(name);
}

export function GearIcon({ name, iconKind, className }: GearIconProps) {
  const kind = resolveKind(iconKind, name);
  const Component = ICON_MAP[kind];
  return <Component className={cn("shrink-0", className)} />;
}
