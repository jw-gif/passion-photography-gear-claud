import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { toast } from "sonner";

interface Props {
  uid: string;
  title: string;
  startDate: string;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  filename?: string;
  size?: "sm" | "default";
  disabled?: boolean;
}

export function IcsExportButton({
  uid,
  title,
  startDate,
  startTime,
  endDate,
  endTime,
  location,
  description,
  filename,
  size = "sm",
  disabled,
}: Props) {
  function handleDownload() {
    try {
      const ics = buildIcs({
        uid,
        title,
        startDate,
        startTime: startTime?.slice(0, 5) ?? null,
        endDate,
        endTime: endTime?.slice(0, 5) ?? null,
        location,
        description,
      });
      const safeTitle = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      downloadIcs(filename ?? `${safeTitle}-${startDate}.ics`, ics);
      toast.success("Calendar invite downloaded");
    } catch (err) {
      toast.error("Couldn't generate calendar invite");
      console.error(err);
    }
  }

  return (
    <Button type="button" size={size} variant="outline" onClick={handleDownload} disabled={disabled}>
      <CalendarPlus className="size-4" />
      Add to calendar
    </Button>
  );
}
