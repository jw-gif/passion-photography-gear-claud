import { useEffect, useMemo, useState } from "react";
import { Copy, Save, Trash2, Sparkles, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShotListEditor } from "@/components/shot-list-editor";
import {
  type Brief,
  emptyBrief,
  normalizeBrief,
  renderBriefAsSlack,
  renderBriefAsMarkdown,
} from "@/lib/shot-list";
import {
  type LocationBlockRow,
  type SegmentBlockRow,
  type TemplateRow,
  fetchLocationBlocks,
  fetchSegmentBlocks,
  fetchTemplates,
  assembleBrief,
} from "@/lib/shot-list-blocks";
import { PHOTOGRAPHER_TIERS } from "@/lib/photographers";

interface Props {
  requestId: string;
  eventName?: string | null;
}

export function RequestBriefPanel({ requestId, eventName }: Props) {
  const [brief, setBrief] = useState<Brief>(emptyBrief());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // bank
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [locations, setLocations] = useState<LocationBlockRow[]>([]);
  const [segments, setSegments] = useState<SegmentBlockRow[]>([]);

  // builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [locationKey, setLocationKey] = useState("");
  const [selectedSegmentKeys, setSelectedSegmentKeys] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>(["point", "door_holder"]);
  const [callTime, setCallTime] = useState("");
  const [wrapTime, setWrapTime] = useState("");
  const [doorCode, setDoorCode] = useState("");
  const [focus, setFocus] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data, error }, tpl, loc, seg] = await Promise.all([
        supabase
          .from("photo_request_shot_lists")
          .select("brief")
          .eq("request_id", requestId)
          .maybeSingle(),
        fetchTemplates().catch(() => []),
        fetchLocationBlocks().catch(() => []),
        fetchSegmentBlocks().catch(() => []),
      ]);
      if (cancelled) return;
      if (error && error.code !== "PGRST116") {
        toast.error(`Couldn't load brief: ${error.message}`);
      }
      if (data?.brief) {
        setBrief(normalizeBrief(data.brief));
        setHasSaved(true);
      } else {
        setBrief(emptyBrief());
        setHasSaved(false);
        setShowBuilder(true);
      }
      setTemplates(tpl);
      setLocations(loc);
      setSegments(seg);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  function applyTemplate(t: TemplateRow) {
    setActiveTemplateId(t.id);
    setLocationKey(t.location_key ?? "");
    setSelectedSegmentKeys(t.segment_keys);
    setRoles(t.roles);
    setCallTime(t.call_time ?? "");
    setWrapTime(t.wrap_time ?? "");
  }

  function build() {
    if (selectedSegmentKeys.length === 0) {
      toast.error("Pick a template or at least one segment first");
      return;
    }
    const loc = locations.find((l) => l.key === locationKey) ?? null;
    const next = assembleBrief(loc, segments, {
      segmentKeys: selectedSegmentKeys,
      roles,
      callTime,
      wrapTime,
      doorCode,
      focus,
    });
    setBrief(next);
    setShowBuilder(false);
    toast.success("Brief built");
  }

  function toggleArr<T extends string>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("photo_request_shot_lists")
      .upsert({ request_id: requestId, brief: brief as unknown as never }, { onConflict: "request_id" });
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    toast.success("Brief saved");
    setHasSaved(true);
  }

  async function clearSaved() {
    if (!confirm("Delete the saved brief for this request?")) return;
    const { error } = await supabase
      .from("photo_request_shot_lists")
      .delete()
      .eq("request_id", requestId);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setBrief(emptyBrief());
    setHasSaved(false);
    setShowBuilder(true);
    toast.success("Brief cleared");
  }

  const slackText = useMemo(() => renderBriefAsSlack(brief, eventName ?? undefined), [brief, eventName]);
  const markdown = useMemo(() => renderBriefAsMarkdown(brief, eventName ?? undefined), [brief, eventName]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading brief…</p>;

  return (
    <Tabs defaultValue="edit">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <div className="flex gap-1">
          {brief.segments.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => copy(slackText, "Slack text")}>
                <Copy className="size-4" /> Slack
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowBuilder((s) => !s)}>
                <Sparkles className="size-4" /> {showBuilder ? "Hide builder" : "Build from template"}
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="size-4" /> {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
          {hasSaved && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={clearSaved}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <TabsContent value="edit">
        {showBuilder && (
          <div className="border rounded-lg p-4 mb-4 bg-muted/20 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Build from a template</h3>
            </div>

            {templates.length > 0 && (
              <div>
                <Label className="text-xs">Template</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {templates.map((t) => (
                    <Chip
                      key={t.id}
                      active={activeTemplateId === t.id}
                      onClick={() => applyTemplate(t)}
                    >
                      {t.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Location</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {locations.map((l) => (
                  <Chip
                    key={l.key}
                    active={locationKey === l.key}
                    onClick={() => {
                      setLocationKey(locationKey === l.key ? "" : l.key);
                      setActiveTemplateId("");
                    }}
                  >
                    {l.alias ?? l.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Segments</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {segments.map((s) => (
                  <Chip
                    key={s.key}
                    active={selectedSegmentKeys.includes(s.key)}
                    onClick={() => {
                      setSelectedSegmentKeys((prev) => toggleArr(prev, s.key));
                      setActiveTemplateId("");
                    }}
                  >
                    {s.title}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Roles to cover</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {PHOTOGRAPHER_TIERS.map((t) => (
                  <Chip
                    key={t.value}
                    active={roles.includes(t.value)}
                    onClick={() => {
                      setRoles((r) => toggleArr(r, t.value));
                      setActiveTemplateId("");
                    }}
                  >
                    {t.short}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Call time</Label>
                <Input
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  placeholder="9:00 AM"
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Wrap</Label>
                <Input
                  value={wrapTime}
                  onChange={(e) => setWrapTime(e.target.value)}
                  placeholder="12:30 PM"
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Door code</Label>
                <Input
                  value={doorCode}
                  onChange={(e) => setDoorCode(e.target.value)}
                  placeholder="1234#"
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Anything special this week?</Label>
              <Textarea
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. baptism Sunday, sponsor signage"
                rows={2}
                className="mt-1 text-sm"
              />
            </div>

            <Button onClick={build} className="w-full" size="sm">
              <FileText className="size-4" /> Build brief
            </Button>
          </div>
        )}

        <ShotListEditor brief={brief} onChange={setBrief} />
      </TabsContent>

      <TabsContent value="preview">
        <Tabs defaultValue="slack">
          <TabsList className="mb-2">
            <TabsTrigger value="slack">Slack</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
          </TabsList>
          <TabsContent value="slack">
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 border rounded-md p-3 max-h-[60vh] overflow-y-auto">
              {slackText.trim() || "No brief yet."}
            </pre>
          </TabsContent>
          <TabsContent value="markdown">
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 border rounded-md p-3 max-h-[60vh] overflow-y-auto">
              {markdown.trim() || "No brief yet."}
            </pre>
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs px-2 py-1 rounded-full border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted text-foreground border-border",
      )}
    >
      {children}
    </button>
  );
}
