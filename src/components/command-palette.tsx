import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  Wrench,
  Users,
  LayoutDashboard,
  Inbox,
  History,
  ListChecks,
  Settings,
  ImageIcon,
} from "lucide-react";

interface SearchResults {
  photo: { id: string; title: string; date: string | null }[];
  gear: { id: string; title: string; date: string }[];
  photographers: { id: string; name: string; email: string }[];
  gearItems: { id: string; name: string }[];
}

const empty: SearchResults = { photo: [], gear: [], photographers: [], gearItems: [] };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(empty);
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(empty);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const like = `%${q}%`;
      const [photoRes, gearRes, peopleRes, gearItemsRes] = await Promise.all([
        supabase
          .from("photo_requests")
          .select("id, event_name, first_name, last_name, event_date")
          .or(
            `event_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`,
          )
          .limit(6),
        supabase
          .from("gear_requests")
          .select("id, requestor_name, location, needed_date")
          .or(`requestor_name.ilike.${like},location.ilike.${like}`)
          .limit(6),
        supabase
          .from("photographers")
          .select("id, name, email")
          .or(`name.ilike.${like},email.ilike.${like}`)
          .limit(6),
        supabase.from("gear").select("id, name").ilike("name", like).limit(6),
      ]);
      if (cancelled) return;
      setResults({
        photo: (photoRes.data ?? []).map((r) => ({
          id: r.id as string,
          title:
            (r.event_name as string | null) ||
            `${r.first_name as string} ${r.last_name as string}`,
          date: r.event_date as string | null,
        })),
        gear: (gearRes.data ?? []).map((r) => ({
          id: r.id as string,
          title: `${r.requestor_name as string} · ${r.location as string}`,
          date: r.needed_date as string,
        })),
        photographers: (peopleRes.data ?? []).map((r) => ({
          id: r.id as string,
          name: r.name as string,
          email: r.email as string,
        })),
        gearItems: (gearItemsRes.data ?? []).map((r) => ({
          id: r.id as string,
          name: r.name as string,
        })),
      });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function go(to: string) {
    setOpen(false);
    setQuery("");
    void navigate({ to });
  }

  const hasResults =
    results.photo.length +
      results.gear.length +
      results.photographers.length +
      results.gearItems.length >
    0;

  // Quick page nav links shown when no query
  const navLinks = useMemo(
    () => [
      { label: "Dashboard", icon: <LayoutDashboard className="size-4" />, to: "/admin" },
      {
        label: "Photography requests",
        icon: <ImageIcon className="size-4" />,
        to: "/admin/requests-photography",
      },
      { label: "Gear requests", icon: <Inbox className="size-4" />, to: "/admin/requests-gear" },
      { label: "Gear board", icon: <Wrench className="size-4" />, to: "/admin/gear" },
      { label: "Manage gear", icon: <Settings className="size-4" />, to: "/admin/gear-manage" },
      { label: "Activity log", icon: <History className="size-4" />, to: "/admin/gear-history" },
      { label: "Team", icon: <Users className="size-4" />, to: "/admin/team" },
      {
        label: "Shot list generator",
        icon: <ListChecks className="size-4" />,
        to: "/admin/shot-list-generator",
      },
    ],
    [],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search requests, photographers, gear… or jump to a page"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!query && (
          <CommandGroup heading="Jump to">
            {navLinks.map((l) => (
              <CommandItem key={l.to} onSelect={() => go(l.to)}>
                {l.icon}
                <span>{l.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query && !hasResults && <CommandEmpty>No matches</CommandEmpty>}

        {results.photo.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Photography requests">
              {results.photo.map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => go("/admin/requests-photography")}
                >
                  <Camera className="size-4" />
                  <span className="flex-1 truncate">{p.title}</span>
                  {p.date && (
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(p.date), "MMM d")}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.gear.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Gear requests">
              {results.gear.map((g) => (
                <CommandItem key={g.id} onSelect={() => go("/admin/requests-gear")}>
                  <Inbox className="size-4" />
                  <span className="flex-1 truncate">{g.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(g.date), "MMM d")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.photographers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Photographers">
              {results.photographers.map((p) => (
                <CommandItem key={p.id} onSelect={() => go("/admin/team")}>
                  <Users className="size-4" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{p.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.gearItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Gear">
              {results.gearItems.map((g) => (
                <CommandItem key={g.id} onSelect={() => go("/admin/gear")}>
                  <Wrench className="size-4" />
                  <span className="flex-1 truncate">{g.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
