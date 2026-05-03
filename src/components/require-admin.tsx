import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/**
 * Wraps admin pages. Redirects to /login if the visitor isn't signed in.
 * By default admits both `admin` and `team` users. Pass `requireAdmin` to
 * restrict to admins only (used by the onboarding admin backend).
 */
export function RequireAdmin({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  /** When true, only `admin` role passes — `team` members are blocked. */
  requireAdmin?: boolean;
}) {
  const { user, isAdmin, isTeam, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({
        to: "/login",
        search: { redirect: location.pathname },
        replace: true,
      });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </main>
    );
  }

  if (!user) {
    // Effect will redirect; render nothing in the meantime
    return null;
  }

  const allowed = requireAdmin ? isAdmin : isTeam;

  if (!allowed) {
    const isTeamButNeedsAdmin = requireAdmin && isTeam && !isAdmin;
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center">
          <h1 className="text-lg font-semibold tracking-tight">
            {isTeamButNeedsAdmin ? "Admin only" : "No access"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isTeamButNeedsAdmin
              ? "This area is reserved for admins. Ask an admin if you need access."
              : "Your account is signed in but doesn't have access to the hub. Ask an admin to grant you access."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Home</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
