import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Camera,
  Wrench,
  ChevronDown,
  Users,
  LogOut,
  ImageIcon,
  Inbox,
  Settings,
  History,
  ArrowLeft,
  ListChecks,
} from "lucide-react";
import pccLogo from "@/assets/pcc-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface HubHeaderProps {
  onLogout: () => void;
  /** Optional title shown next to the logo on inner pages. Omit on the hub home. */
  title?: string;
  subtitle?: string;
}

export function HubHeader({ onLogout, title, subtitle }: HubHeaderProps) {
  const showInnerLabel = !!title;
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();

  // Highlight dropdown triggers when on any of their sub-routes.
  const photographyActive =
    pathname.startsWith("/admin/requests-photography") ||
    pathname.startsWith("/admin/shot-list-generator");
  const gearActive =
    pathname.startsWith("/admin/gear") ||
    pathname.startsWith("/admin/requests-gear");
  const teamActive =
    pathname.startsWith("/admin/team") ||
    pathname.startsWith("/admin/onboarding");

  return (
    <header className="px-4 sm:px-6 py-4 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <Link
          to="/admin"
          className="group flex items-center gap-2 rounded-md hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="size-8 rounded-full bg-primary flex items-center justify-center relative overflow-hidden">
            <img
              src={pccLogo}
              alt="PCC"
              className="size-5 object-contain transition-opacity duration-200 group-hover:opacity-0"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <ArrowLeft className="size-4 text-primary-foreground absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </div>
          <div className="hidden sm:block">
            <div className="font-semibold tracking-tight leading-tight">
              {showInnerLabel ? title : "Photography Hub"}
            </div>
            <div className="text-xs text-muted-foreground">
              {showInnerLabel ? subtitle ?? "Passion Photography Hub" : "Passion"}
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-muted border-b-2 border-primary rounded-b-none" }}
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(photographyActive && "bg-muted border-b-2 border-primary rounded-b-none")}
              >
                <Camera className="size-4" />
                <span className="hidden md:inline">Photography</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Photography</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/requests-photography" className="flex items-start gap-3 py-2">
                  <ImageIcon className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Requests</div>
                    <div className="text-xs text-muted-foreground">Review incoming event requests</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/shot-list-generator" className="flex items-start gap-3 py-2">
                  <ListChecks className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Shot list generator</div>
                    <div className="text-xs text-muted-foreground">Build shot lists from event details</div>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(gearActive && "bg-muted border-b-2 border-primary rounded-b-none")}
              >
                <Wrench className="size-4" />
                <span className="hidden md:inline">Gear</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Gear</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/gear" className="flex items-start gap-3 py-2">
                  <LayoutDashboard className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Board</div>
                    <div className="text-xs text-muted-foreground">See all gear at a glance</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/requests-gear" className="flex items-start gap-3 py-2">
                  <Inbox className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Requests</div>
                    <div className="text-xs text-muted-foreground">Approve or reject pending gear requests</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/gear-manage" className="flex items-start gap-3 py-2">
                  <Settings className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Manage</div>
                    <div className="text-xs text-muted-foreground">Add, edit, or retire gear items</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/gear-history" className="flex items-start gap-3 py-2">
                  <History className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Activity log</div>
                    <div className="text-xs text-muted-foreground">Full history of gear movements</div>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(teamActive && "bg-muted border-b-2 border-primary rounded-b-none")}
              >
                <Users className="size-4" />
                <span className="hidden md:inline">Team</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Team</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/team" className="flex items-start gap-3 py-2">
                  <Users className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Members</div>
                    <div className="text-xs text-muted-foreground">Manage photographers and admins</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin/onboarding" className="flex items-start gap-3 py-2">
                    <ListChecks className="size-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Onboarding</div>
                      <div className="text-xs text-muted-foreground">Set up onboarding flows for new hires</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="size-4" />
            <span className="hidden md:inline">Sign out</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
