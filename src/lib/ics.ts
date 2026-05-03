/**
 * Minimal RFC-5545 .ics generator for client-side downloads.
 * Used by photographers to add a claimed shoot to their personal calendar.
 */

interface IcsInput {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  /** YYYY-MM-DD */
  startDate: string;
  /** HH:mm or HH:mm:ss — optional; if missing the event is all-day */
  startTime?: string | null;
  /** YYYY-MM-DD — defaults to startDate */
  endDate?: string | null;
  /** HH:mm or HH:mm:ss — optional */
  endTime?: string | null;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function fmtLocalDateTime(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

function fmtDate(date: string): string {
  return date.replace(/-/g, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildIcs(input: IcsInput): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Passion Photography Hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}@passion-photography-hub`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${escapeText(input.title)}`,
  ];

  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`);
  if (input.description) lines.push(`DESCRIPTION:${escapeText(input.description)}`);

  if (input.startTime) {
    const endDate = input.endDate ?? input.startDate;
    const endTime = input.endTime ?? input.startTime;
    lines.push(`DTSTART:${fmtLocalDateTime(input.startDate, input.startTime)}`);
    lines.push(`DTEND:${fmtLocalDateTime(endDate, endTime)}`);
  } else {
    // All-day event — DTEND is exclusive
    const endDate = input.endDate ?? input.startDate;
    const [y, m, d] = endDate.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const exclusive = `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
    lines.push(`DTSTART;VALUE=DATE:${fmtDate(input.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${exclusive}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
