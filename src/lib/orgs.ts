export const COMPANIES = [
  "Passion City Church",
  "Passion Conference",
  "Passion Institute",
  "Passion Publishing",
  "Passion Resources",
  "sixstepsrecords",
] as const;
export type Company = (typeof COMPANIES)[number];

// Sub-teams shown when "Passion City Church" is selected as the company
export const PCC_TEAMS = [
  "Atlanta City",
  "bloom",
  "Building",
  "Care",
  "Community",
  "CORE",
  "Creative",
  "Design",
  "Experience",
  "Fight Club",
  "Film",
  "Finance",
  "Flourish",
  "Global Brand",
  "Grove",
  "Hospitality",
  "Love Atlanta",
  "Operations",
  "Passion Kids",
  "Passion Leadership Experience",
  "Pastor's Team",
  "Production",
  "Social Media/Communications",
  "Students",
  "Team Development/HR",
  "Technology",
  "UNITE",
  "Worship",
  "Young Adults",
] as const;
export type PccTeam = (typeof PCC_TEAMS)[number];

export const EVENT_LOCATIONS = [
  "515",
  "Cumberland",
  "Trilith",
  "Other",
] as const;
export type EventLocation = (typeof EVENT_LOCATIONS)[number];

export const COVERAGE_TYPES = [
  { value: "live_event", label: "Live Event Coverage" },
  { value: "photo_booth", label: "Photo Booth" },
  { value: "other", label: "Other" },
] as const;
export type CoverageType = (typeof COVERAGE_TYPES)[number]["value"];

export const REQUEST_TYPES = [
  {
    value: "photography_team",
    label: "Photography Team",
    description:
      "Book a team for your Gathering/Event (Community Groups, The Rising, etc.) or a Sunday event that needs additional photographers — Photo Booths, Team Headshots, Celebrations, Team Meetings, etc.",
  },
  {
    value: "shot_list_addition",
    label: "Shot List Addition",
    description:
      "Add specific shots to an existing scheduled shoot — moments, people, or details we should be sure to capture.",
  },
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number]["value"];

/**
 * Photography rate card (June 2024). Each tier groups multiple event types
 * that share the same flat rate for a Point on the Door Holder Photography
 * Team. Used by the request form to let requestors quickly pick a budget.
 */
export const PHOTO_RATE_CARD = [
  {
    amount: 200,
    label: "$200",
    examples: [
      "Sunday After Parties",
      "Child Dedications",
      "Post-gathering baptisms / events / meetings",
    ],
  },
  {
    amount: 300,
    label: "$300",
    examples: [
      "Family Ministries Gatherings",
      "Young Adult Collectives / Groups",
      "Passion Worship Academy",
      "Community Group Events / Gatherings",
      "CORE, Launch, UNITE, etc.",
      "Team / Training Nights / Collectives",
    ],
  },
  {
    amount: 400,
    label: "$400",
    examples: [
      "The Rising",
      "The Grove",
      "Fight Night",
      "Summer In The City",
    ],
  },
] as const;

export const PHOTO_REQUEST_STATUSES = [
  { value: "new", label: "New" },
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In Review" },
  { value: "approved_job_board", label: "Approved – Serving Opportunities" },
  { value: "approved_shot_list", label: "Approved – Shot List Add" },
  { value: "needs_revisions", label: "Needs Revisions" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "denied", label: "Denied" },
  { value: "declined", label: "Declined" },
  { value: "archived", label: "Archived" },
] as const;
export type PhotoRequestStatus = (typeof PHOTO_REQUEST_STATUSES)[number]["value"];

/** Statuses considered "closed" — hidden from the default Open queue. */
export const CLOSED_PHOTO_REQUEST_STATUSES: PhotoRequestStatus[] = [
  "completed",
  "archived",
  "declined",
  "denied",
];

export function statusLabel(s: PhotoRequestStatus): string {
  return PHOTO_REQUEST_STATUSES.find((x) => x.value === s)?.label ?? s;
}

export function statusBadgeClasses(s: PhotoRequestStatus): string {
  switch (s) {
    case "new":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "pending":
    case "in_review":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "approved_job_board":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
    case "approved_shot_list":
      return "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30";
    case "needs_revisions":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "scheduled":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30";
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "denied":
    case "declined":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "archived":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// ----- Gear request status helpers -----
export type GearRequestStatus = "pending" | "approved" | "denied";

export function gearRequestStatusLabel(s: GearRequestStatus): string {
  switch (s) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "denied":
      return "Denied";
  }
}

export function gearRequestBadgeClasses(s: GearRequestStatus): string {
  switch (s) {
    case "pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "approved":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "denied":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  }
}

/**
 * Returns a Tailwind background-color class used for calendar pills and dots,
 * unified across photo and gear request statuses.
 */
export function statusDotColor(
  status: PhotoRequestStatus | GearRequestStatus,
): string {
  switch (status) {
    case "approved":
    case "scheduled":
      return "bg-emerald-500";
    case "approved_job_board":
      return "bg-sky-500";
    case "approved_shot_list":
      return "bg-teal-500";
    case "pending":
    case "in_review":
      return "bg-amber-500";
    case "needs_revisions":
      return "bg-orange-500";
    case "new":
      return "bg-blue-500";
    case "denied":
    case "declined":
      return "bg-rose-500";
    case "completed":
    case "archived":
      return "bg-zinc-400";
    default:
      return "bg-zinc-400";
  }
}
