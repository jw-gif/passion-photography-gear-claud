import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, FileText, Settings2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/require-admin";
import { HubHeader } from "@/components/hub-header";
import { AdminBreadcrumb } from "@/components/admin-breadcrumb";
import { ShotListEditor } from "@/components/shot-list-editor";
import {
  type Brief,
  emptyBrief,
  renderBriefAsSlack,
  renderBriefAsMarkdown,
} from "@/lib/shot-list";
import { PHOTOGRAPHER_TIERS } from "@/lib/photographers";
import {
  type LocationBlockRow,
  type SegmentBlockRow,
  type TemplateRow,
  fetchLocationBlocks,
  fetchSegmentBlocks,
  fetchTemplates,
  assembleBrief,
} from "@/lib/shot-list-blocks";

export const Route = createFileRoute("/admin_/shot-list-generator")({
  head: () => ({
    meta: [
      { title: "Shot List Generator · Passion Photography Hub" },
      {
        name: "description",
        content:
          "Pick a template, tweak this week's details, and copy a Slack-ready brief. No AI — just curated blocks.",
      },
    ],
  }),
  component: ShotListGeneratorRoute,
});

function ShotListGeneratorRoute() {
  const { signOut } = useAuth();
  return (
    <RequireAdmin>
      <ShotListGeneratorPage onLogout={() => signOut()} />
    </RequireAdmin>
  );
}

function ShotListGeneratorPage({ onLogout }: { onLogout: () => void }) {
  const [locations, setLocations] = useState<LocationBlockRow[]>([]);
  const [segments, setSegments] = useState<SegmentBlockRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [eventName, setEventName] = useState("");
  const [locationKey, setLocationKey] = useState<string>("");
  const [selectedSegmentKeys, setSelectedSegmentKeys] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>(["point", "door_holder"]);
  const [callTime, setCallTime] = useState("");
  const [wrapTime, setWrapTime] = useState("");
  const [doorCode, setDoorCode] = useState("");
  const [focus, setFocus] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");

  const [brief, setBrief] = useState<Brief>(emptyBrief());
  const [hasBuilt, setHasBuilt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loc, seg, tpl] = await Promise.all([
          fetchLocationBlocks(),
          fetchSegmentBlocks(),
          fetchTemplates(),
        ]);
        if (cancelled) return;
        setLocations(loc);
        setSegments(seg);
        setTemplates(tpl);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Couldn't load blocks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.key === locationKey) ?? null,
    [locations, locationKey],
  );

  function applyTemplate(t: TemplateRow) {
    setActiveTemplateId(t.id);
    setLocationKey(t.location_key ?? "");
    setSelectedSegmentKeys(t.segment_keys);
    setRoles(t.roles);
    setCallTime(t.call_time ?? "");
    setWrapTime(t.wrap_time ?? "");
    toast.success(`Template "${t.name}" loaded — tweak and build`);
  }

  function build() {
    if (selectedSegmentKeys.length === 0) {
      toast.error("Pick at least one segment first");
      return;
    }
    const next = assembleBrief(selectedLocation, segments, {
      segmentKeys: selectedSegmentKeys,
      roles,
      callTime,
      wrapTime,
      doorCode,
      focus,
    });
    setBrief(next);
    setHasBuilt(true);
    toast.success("Brief built");
  }

  function clearBrief() {
    setBrief(emptyBrief());
    setHasBuilt(false);
  }

  function toggleArr<T extends string>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  function toggleSegment(key: string) {
    setSelectedSegmentKeys((prev) => toggleArr(prev, key));
    setActiveTemplateId(""); // user is diverging from the template
  }

  const slackText = useMemo(() => renderBriefAsSlack(brief, eventName), [brief, eventName]);
  const markdown = useMemo(() => renderBriefAsMarkdown(brief, eventName), [brief, eventName]);

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Couldn't copy — please select and copy manually");
    }
  }

  function download() {
    const blob = new Blob([slackText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = (eventName || "shot-list")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    a.download = `${slug || "shot-list"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen">
      <HubHeader onLogout={onLogout} title="Shot List Generator" subtitle="Template-driven brief builder" />
      <AdminBreadcrumb items={[{ label: "Photography", to: "/admin/requests-photography" }, { label: "Shot List Generator" }]} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shot List Generator</h1>
            <p className="text-sm text-muted-foreground">
              Pick a template, tweak this week's details, and copy a Slack-ready brief.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/shot-list-blocks">
              <Settings2 className="size-4" /> Manage blocks &amp; templates
            </Link>
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading blocks…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Inputs */}
            <Card className="p-4 space-y-4 lg:col-span-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Templates
                </h2>
                {templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No templates yet.{" "}
                    <Link to="/admin/shot-list-blocks" className="underline">
                      Create one
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {templates.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className={cn(
                          "text-xs px-2 py-1 rounded-md border transition-colors",
                          activeTemplateId === t.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted text-foreground border-border",
                        )}
                      >
                        <Sparkles className="size-3 inline mr-1 opacity-70" />
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  This shoot
                </h2>

                <div>
                  <Label htmlFor="event-name" className="text-xs">Event name</Label>
                  <Input
                    id="event-name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Sunday Aug 18"
                    className="mt-1"
                  />
                </div>

                <div className="mt-3">
                  <Label className="text-xs">Location</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {locations.map((l) => (
                      <ChipToggle
                        key={l.key}
                        active={locationKey === l.key}
                        onClick={() => {
                          setLocationKey(locationKey === l.key ? "" : l.key);
                          setActiveTemplateId("");
                        }}
                      >
                        {l.alias ?? l.label}
                      </ChipToggle>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <Label className="text-xs">Roles to cover</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PHOTOGRAPHER_TIERS.map((t) => (
                      <ChipToggle
                        key={t.value}
                        active={roles.includes(t.value)}
                        onClick={() => {
                          setRoles((r) => toggleArr(r, t.value));
                          setActiveTemplateId("");
                        }}
                      >
                        {t.short}
                      </ChipToggle>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <Label htmlFor="call-time" className="text-xs">Call time</Label>
                    <Input
                      id="call-time"
                      value={callTime}
                      onChange={(e) => setCallTime(e.target.value)}
                      placeholder="9:00 AM"
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="wrap" className="text-xs">Wrap</Label>
                    <Input
                      id="wrap"
                      value={wrapTime}
                      onChange={(e) => setWrapTime(e.target.value)}
                      placeholder="12:30 PM"
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <Label htmlFor="door" className="text-xs">Door code</Label>
                  <Input
                    id="door"
                    value={doorCode}
                    onChange={(e) => setDoorCode(e.target.value)}
                    placeholder="1234#"
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <div className="mt-3">
                  <Label htmlFor="focus" className="text-xs">
                    Anything special this week?
                  </Label>
                  <Textarea
                    id="focus"
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    placeholder="e.g. baptism Sunday, sponsor signage"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs">Segments</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {segments.map((s) => (
                    <ChipToggle
                      key={s.key}
                      active={selectedSegmentKeys.includes(s.key)}
                      onClick={() => toggleSegment(s.key)}
                    >
                      {s.title}
                    </ChipToggle>
                  ))}
                </div>
              </div>

              <Button onClick={build} className="w-full">
                <FileText className="size-4" />
                {hasBuilt ? "Rebuild brief" : "Build brief"}
              </Button>
            </Card>

            {/* Editor */}
            <Card className="p-4 lg:col-span-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Brief
                </h2>
                {brief.segments.length > 0 && (
                  <Button type="button" size="sm" variant="ghost" onClick={clearBrief}>
                    Clear
                  </Button>
                )}
              </div>
              {brief.segments.length === 0 ? (
                <div className="border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground">
                  <FileText className="size-8 mx-auto mb-2 opacity-50" />
                  Pick a template (or pick segments manually) and tap{" "}
                  <strong>Build brief</strong>.
                </div>
              ) : (
                <ShotListEditor brief={brief} onChange={setBrief} />
              )}
            </Card>

            {/* Output */}
            <Card className="p-4 lg:col-span-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Output
                </h2>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(slackText, "Slack")}
                    disabled={brief.segments.length === 0}
                  >
                    <Copy className="size-4" /> Slack
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(markdown, "Markdown")}
                    disabled={brief.segments.length === 0}
                  >
                    <Copy className="size-4" /> MD
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={download}
                    disabled={brief.segments.length === 0}
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="slack">
                <TabsList className="mb-3">
                  <TabsTrigger value="slack">Slack</TabsTrigger>
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                </TabsList>
                <TabsContent value="slack">
                  <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 border rounded-md p-3 max-h-[60vh] overflow-y-auto">
                    {slackText.trim() || "Build a brief to see the preview."}
                  </pre>
                </TabsContent>
                <TabsContent value="markdown">
                  <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 border rounded-md p-3 max-h-[60vh] overflow-y-auto">
                    {markdown.trim() || "Build a brief to see the preview."}
                  </pre>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}

function ChipToggle({
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
