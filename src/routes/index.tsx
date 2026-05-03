import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";
import { LOCATIONS, MOVERS, locationClasses, locationLabel, formatDate, getSubLocations, type Location } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Camera, Check, CircleSlash, Wrench } from "lucide-react";
import { GearIcon } from "@/lib/gear-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GearRequestForm } from "@/components/gear-request-form";

interface Search {
  gear?: string;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    gear: search.gear !== undefined && search.gear !== null && search.gear !== ""
      ? String(search.gear)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Passion Photography Hub" },
      { name: "description", content: "Request photography gear for your event. Quick, simple, and tracked." },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { gear } = Route.useSearch();
  const { isAdmin } = useAuth();
  if (gear) return <PublicGearView gearId={gear} />;
  return (
    <>
      <GearRequestForm />
      <footer className="pb-10 pt-2 flex justify-center">
        <Link
          to={isAdmin ? "/admin" : "/login"}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Lock className="size-3" />
          {isAdmin ? "Admin portal" : "Admin login"}
        </Link>
      </footer>
    </>
  );
}


type GearStatus = "active" | "out_of_service" | "out_for_repair";

interface GearRow {
  id: string;
  name: string;
  current_location: string;
  sub_location: string | null;
  last_note: string | null;
  last_updated: string;
  moved_by: string | null;
  status: GearStatus;
  icon_kind: string | null;
}

function PublicGearView({ gearId }: { gearId: string }) {
  const { displayName, isAdmin } = useAuth();
  const [gear, setGear] = useState<GearRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<Location>("515");
  const [subLocChoice, setSubLocChoice] = useState<string>("");
  const [otherSubLoc, setOtherSubLoc] = useState("");
  const [subLocError, setSubLocError] = useState("");
  const [note, setNote] = useState("");
  const [moverChoice, setMoverChoice] = useState<string>("");
  const [otherName, setOtherName] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-select admin's display name when signed in
  useEffect(() => {
    if (!isAdmin || !displayName || moverChoice) return;
    if ((MOVERS as readonly string[]).includes(displayName)) {
      setMoverChoice(displayName);
    } else {
      setMoverChoice("Other");
      setOtherName(displayName);
    }
  }, [isAdmin, displayName, moverChoice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gear")
        .select("*")
        .eq("id", gearId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setGear(data as GearRow);
        setSelectedLoc(data.current_location as Location);
        // Pre-populate sub-location if it matches a known option for this location
        const known = getSubLocations(data.current_location);
        if (data.sub_location && known.includes(data.sub_location)) {
          setSubLocChoice(data.sub_location);
        } else if (data.sub_location) {
          setSubLocChoice("Other");
          setOtherSubLoc(data.sub_location);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [gearId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gear) return;

    const movedBy =
      moverChoice === "Other" ? otherName.trim() : moverChoice;
    if (!movedBy) {
      setNameError(
        moverChoice === "Other"
          ? "Please enter your name"
          : "Please select your name",
      );
      return;
    }
    setNameError("");

    const subLocation =
      subLocChoice === "Other" ? otherSubLoc.trim() : subLocChoice;
    if (!subLocation) {
      setSubLocError(
        subLocChoice === "Other"
          ? "Please enter the location"
          : "Please select a location",
      );
      return;
    }
    setSubLocError("");

    setSubmitting(true);
    const trimmedNote = note.trim() || null;
    const { error: updateErr } = await supabase
      .from("gear")
      .update({
        current_location: selectedLoc,
        sub_location: subLocation,
        last_note: trimmedNote,
        last_updated: new Date().toISOString(),
        moved_by: movedBy,
      })
      .eq("id", gear.id);
    if (!updateErr) {
      await supabase.from("gear_history").insert({
        gear_id: gear.id,
        location: selectedLoc,
        sub_location: subLocation,
        note: trimmedNote,
        moved_by: movedBy,
      });
      // refresh
      const { data } = await supabase
        .from("gear")
        .select("*")
        .eq("id", gear.id)
        .maybeSingle();
      if (data) setGear(data as GearRow);
      setNote("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Wrench className="size-6 animate-pulse" />
          <span className="text-sm">Loading gear info…</span>
        </div>
      </main>
    );
  }
  if (notFound || !gear) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <Card className="max-w-sm w-full p-8 text-center">
          <CircleSlash className="size-10 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-xl font-semibold">Gear not found</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            No item matched that QR code. Try scanning again, or go to the gear request form.
          </p>
          <div className="mt-5">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Go to gear request form</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="size-7 rounded-full bg-primary flex items-center justify-center">
            <Camera className="size-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Passion Photography Hub</span>
        </div>

        <GearIcon name={gear.name} iconKind={gear.icon_kind} className="size-12 text-foreground/80 mb-4" />

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          {gear.name}
        </h1>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Current location
          </div>
          <div
            className={cn(
              "inline-flex items-center px-5 py-3 rounded-full text-2xl font-bold",
              locationClasses(gear.current_location),
            )}
          >
            {locationLabel(gear.current_location)}
          </div>
          {gear.sub_location && (
            <div className="mt-2 text-base font-medium text-foreground/80">
              {gear.sub_location}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Last updated
          </div>
          <div className="text-sm">
            {formatDate(gear.last_updated)}
            {gear.moved_by && (
              <span className="text-muted-foreground"> · by {gear.moved_by}</span>
            )}
          </div>
          {gear.last_note && (
            <div className="text-sm text-muted-foreground italic pt-1">
              "{gear.last_note}"
            </div>
          )}
        </div>

        {gear.status !== "active" && (
          <div
            className={cn(
              "mt-8 p-4 rounded-xl border-2 flex items-start gap-3",
              gear.status === "out_of_service"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-loc-cumberland/10 border-loc-cumberland/40 text-loc-cumberland-foreground",
            )}
          >
            {gear.status === "out_of_service" ? (
              <CircleSlash className="size-5 mt-0.5 shrink-0" />
            ) : (
              <Wrench className="size-5 mt-0.5 shrink-0" />
            )}
            <div>
              <div className="font-semibold">
                {gear.status === "out_of_service" ? "Out of service" : "Out for repair"}
              </div>
              <div className="text-sm opacity-90 mt-0.5">
                This gear is currently unavailable and can't be moved. Contact an admin if you need it.
              </div>
            </div>
          </div>
        )}

        {gear.status === "active" && (
        <Card className="mt-10 p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="text-sm font-semibold mb-3">Move to</div>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setSelectedLoc(loc);
                      setSubLocChoice("");
                      setOtherSubLoc("");
                      setSubLocError("");
                    }}
                    className={cn(
                      "py-3 rounded-lg text-sm font-semibold border-2 transition-all",
                      selectedLoc === loc
                        ? cn(locationClasses(loc), "border-transparent")
                        : "bg-background border-border text-foreground hover:border-foreground/30",
                    )}
                  >
                    {locationLabel(loc)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2" htmlFor="sublocation">
                Spot at {selectedLoc} <span className="text-destructive">*</span>
              </label>
              <Select
                value={subLocChoice}
                onValueChange={(v) => {
                  setSubLocChoice(v);
                  setSubLocError("");
                }}
              >
                <SelectTrigger id="sublocation" className="w-full">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {getSubLocations(selectedLoc).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {subLocChoice === "Other" && (
                <Input
                  className="mt-2"
                  value={otherSubLoc}
                  onChange={(e) => {
                    setOtherSubLoc(e.target.value);
                    setSubLocError("");
                  }}
                  placeholder="Describe the spot"
                  maxLength={100}
                  autoFocus
                />
              )}
              {subLocError && (
                <p className="text-destructive text-sm mt-2">{subLocError}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2" htmlFor="mover">
                Your name <span className="text-destructive">*</span>
              </label>
              <Select
                value={moverChoice}
                onValueChange={(v) => {
                  setMoverChoice(v);
                  setNameError("");
                }}
              >
                <SelectTrigger id="mover" className="w-full">
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  {MOVERS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {moverChoice === "Other" && (
                <Input
                  className="mt-2"
                  value={otherName}
                  onChange={(e) => {
                    setOtherName(e.target.value);
                    setNameError("");
                  }}
                  placeholder="Enter your name"
                  maxLength={50}
                  autoFocus
                />
              )}
              {nameError && (
                <p className="text-destructive text-sm mt-2">{nameError}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2" htmlFor="note">
                Note (optional)
              </label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Left at FOH for Ivana"
                maxLength={200}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? "Updating…" : "Update location"}
            </Button>

            {success && (
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-loc-trilith bg-loc-trilith/10 rounded-lg py-3">
                <Check className="size-4" /> Location updated
              </div>
            )}
          </form>
        </Card>
        )}
      </div>
    </main>
  );
}
