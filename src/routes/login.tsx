import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LoginSearch {
  redirect?: string;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in · Passion Gear Tracking" },
      { name: "description", content: "Sign in to manage gear inventory and requests." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, isAdmin } = useAuth();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) {
        navigate({ to: redirect || "/admin", replace: true });
      } else {
        navigate({ to: redirect || "/onboarding", replace: true });
      }
    }
  }, [loading, user, isAdmin, redirect, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }
    // Sign-in succeeded. Admin vs hire routing happens in the effect above
    // once useAuth picks up the new session. We also try to link the auth
    // user to a matching onboarding_hires row by email (if one exists and
    // hasn't been linked yet).
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u?.email) {
      await supabase
        .from("onboarding_hires")
        .update({ user_id: u.id })
        .eq("email", u.email.toLowerCase())
        .is("user_id", null);
    }
    setSubmitting(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    toast.success("Password reset email sent", {
      description: "Check your inbox for a link to reset your password.",
    });
    setMode("signin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center">
            <Camera className="size-4" />
          </div>
          <div>
            <div className="font-semibold tracking-tight leading-tight">
              {mode === "signin" ? "Sign in" : "Reset password"}
            </div>
            <div className="text-xs text-muted-foreground">Passion Staff Hub</div>
          </div>
        </div>

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2" htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2" htmlFor="pw">Password</label>
              <PasswordInput
                id="pw"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); }}
                className="text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </button>
              <Link to="/" className="text-muted-foreground hover:text-foreground">
                ← Home
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your email to receive a password reset link.
            </p>
            <div>
              <label className="text-sm font-medium block mb-2" htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                autoFocus
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); }}
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to sign in
            </button>
          </form>
        )}
      </Card>
    </main>
  );
}
