import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/password-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password · Passion Gear Tracking" },
      { name: "description", content: "Set a new password for your admin account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from URL hash automatically
    // and fires PASSWORD_RECOVERY event on auth state change.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also check existing session in case event already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: pw });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/admin", replace: true });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center">
            <Camera className="size-4" />
          </div>
          <div>
            <div className="font-semibold tracking-tight leading-tight">Set a new password</div>
            <div className="text-xs text-muted-foreground">Passion Gear Tracking</div>
          </div>
        </div>

        {!ready ? (
          <div className="text-sm text-muted-foreground">
            Verifying reset link…
            <div className="mt-4">
              <Link to="/login" className="text-foreground hover:underline">
                ← Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2" htmlFor="pw">New password</label>
              <PasswordInput
                id="pw"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError(""); }}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2" htmlFor="pw2">Confirm password</label>
              <PasswordInput
                id="pw2"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => { setPw2(e.target.value); setError(""); }}
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
