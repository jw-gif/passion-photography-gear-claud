import { Button } from "@/components/ui/button";
import { Check, ListChecks, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhotoRequestStatus } from "@/lib/orgs";

interface Props {
  current: PhotoRequestStatus;
  onSetStatus: (s: PhotoRequestStatus) => void;
  disabled?: boolean;
}

/**
 * Compact left-side action rail for the photo request detail dialog. Each
 * action is one click and visually emphasises the status it sets.
 */
export function RequestActionRail({ current, onSetStatus, disabled }: Props) {
  const actions: {
    status: PhotoRequestStatus;
    label: string;
    short: string;
    icon: React.ReactNode;
    activeClass: string;
  }[] = [
    {
      status: "approved_job_board",
      label: "Approve to job board",
      short: "Board",
      icon: <Check className="size-4" />,
      activeClass: "bg-sky-500 hover:bg-sky-600 text-white border-sky-500",
    },
    {
      status: "approved_shot_list",
      label: "Approve as shot list addition",
      short: "Shot list",
      icon: <ListChecks className="size-4" />,
      activeClass: "bg-teal-500 hover:bg-teal-600 text-white border-teal-500",
    },
    {
      status: "needs_revisions",
      label: "Needs revisions",
      short: "Revise",
      icon: <AlertTriangle className="size-4" />,
      activeClass: "bg-orange-500 hover:bg-orange-600 text-white border-orange-500",
    },
    {
      status: "denied",
      label: "Deny",
      short: "Deny",
      icon: <X className="size-4" />,
      activeClass: "bg-rose-500 hover:bg-rose-600 text-white border-rose-500",
    },
  ];

  return (
    <div className="flex sm:flex-col gap-1.5 flex-wrap">
      {actions.map((a) => {
        const isCurrent = current === a.status;
        return (
          <Button
            key={a.status}
            type="button"
            size="sm"
            variant={isCurrent ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onSetStatus(a.status)}
            className={cn(
              "justify-start gap-2",
              isCurrent && a.activeClass,
            )}
            title={`Press to mark: ${a.label}`}
          >
            {a.icon}
            <span className="text-xs font-medium">{a.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
