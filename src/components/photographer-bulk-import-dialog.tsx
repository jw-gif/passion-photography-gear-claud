import { useState } from "react";
import { Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  type PhotographerTier,
  generatePhotographerToken,
} from "@/lib/photographers";

interface ParsedRow {
  rowNum: number;
  name: string;
  email: string;
  phone: string | null;
  tier: PhotographerTier;
  error?: string;
}

const TEMPLATE = `name,email,phone,tier
Jane Doe,jane@example.com,+1 555 555 5555,point
John Smith,john@example.com,,door_holder
Sam Lee,sam@example.com,+1 555 111 2222,training_door_holder`;

function normalizeTier(input: string): PhotographerTier | null {
  const t = input.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (t === "point") return "point";
  if (t === "door_holder" || t === "doorholder") return "door_holder";
  if (
    t === "training_door_holder" ||
    t === "training" ||
    t === "trainingdoorholder" ||
    t === "training_doorholder"
  )
    return "training_door_holder";
  return null;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        result.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  // Detect/skip header
  const first = parseCsvLine(lines[0]).map((s) => s.toLowerCase());
  const hasHeader =
    first.includes("name") || first.includes("email") || first.includes("tier");
  const headers = hasHeader ? first : ["name", "email", "phone", "tier"];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const idxName = headers.indexOf("name");
  const idxEmail = headers.indexOf("email");
  const idxPhone = headers.indexOf("phone");
  const idxTier = headers.indexOf("tier");

  return dataLines.map((line, i) => {
    const cols = parseCsvLine(line);
    const name = (idxName >= 0 ? cols[idxName] : cols[0]) ?? "";
    const email = (idxEmail >= 0 ? cols[idxEmail] : cols[1]) ?? "";
    const phone = (idxPhone >= 0 ? cols[idxPhone] : cols[2]) ?? "";
    const tierRaw = (idxTier >= 0 ? cols[idxTier] : cols[3]) ?? "door_holder";

    const tier = normalizeTier(tierRaw) ?? "door_holder";
    const row: ParsedRow = {
      rowNum: i + (hasHeader ? 2 : 1),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      tier,
    };
    if (!row.name) row.error = "Missing name";
    else if (!row.email) row.error = "Missing email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
      row.error = "Invalid email";
    else if (!normalizeTier(tierRaw))
      row.error = `Unknown tier "${tierRaw}" (using door_holder)`;
    return row;
  });
}

export function PhotographerBulkImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  const rows = text.trim() ? parseCsv(text) : [];
  const validRows = rows.filter((r) => !r.error || r.error.startsWith("Unknown tier"));
  const invalidRows = rows.filter((r) => r.error && !r.error.startsWith("Unknown tier"));

  function reset() {
    setText("");
  }

  function handleClose() {
    if (importing) return;
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    const content = await file.text();
    setText(content);
  }

  async function handleImport() {
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    setImporting(true);

    const payload = validRows.map((r) => ({
      name: r.name,
      email: r.email,
      phone: r.phone,
      tier: r.tier,
      token: generatePhotographerToken(),
    }));

    const { data, error } = await supabase
      .from("photographers")
      .insert(payload)
      .select("id");

    setImporting(false);

    if (error) {
      toast.error(`Import failed: ${error.message}`);
      return;
    }

    toast.success(`Imported ${data?.length ?? payload.length} photographers`);
    reset();
    onClose();
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "photographers-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import photographers</DialogTitle>
          <DialogDescription>
            Paste CSV content or upload a .csv file. Columns:{" "}
            <code className="text-xs">name, email, phone, tier</code>. Tier
            values: <code className="text-xs">point</code>,{" "}
            <code className="text-xs">door_holder</code>,{" "}
            <code className="text-xs">training_door_holder</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <FileUp className="size-4" /> Upload .csv
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              Download template
            </Button>
          </div>

          <div>
            <Label htmlFor="csv-text" className="text-xs">
              CSV content
            </Label>
            <Textarea
              id="csv-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={TEMPLATE}
              className="font-mono text-xs h-40 mt-1"
            />
          </div>

          {rows.length > 0 && (
            <div className="border rounded-md max-h-64 overflow-auto text-xs">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 w-10">#</th>
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Email</th>
                    <th className="px-2 py-1.5">Phone</th>
                    <th className="px-2 py-1.5">Tier</th>
                    <th className="px-2 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.rowNum}
                      className={
                        r.error && !r.error.startsWith("Unknown tier")
                          ? "bg-destructive/10"
                          : "border-t"
                      }
                      title={r.error}
                    >
                      <td className="px-2 py-1 text-muted-foreground">
                        {r.rowNum}
                      </td>
                      <td className="px-2 py-1">{r.name || "—"}</td>
                      <td className="px-2 py-1">{r.email || "—"}</td>
                      <td className="px-2 py-1">{r.phone || "—"}</td>
                      <td className="px-2 py-1">{r.tier}</td>
                      <td className="px-2 py-1">
                        {r.error ? (
                          <AlertCircle className="size-3.5 text-destructive" />
                        ) : (
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {validRows.length} valid · {invalidRows.length} skipped
              {invalidRows.length > 0 && " (hover for reason)"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || validRows.length === 0}
          >
            <Upload className="size-4" />
            {importing
              ? "Importing…"
              : `Import ${validRows.length || ""} photographer${
                  validRows.length === 1 ? "" : "s"
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
