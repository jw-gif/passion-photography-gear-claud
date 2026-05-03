import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import pccLogo from "@/assets/pcc-logo.png";

export const Route = createFileRoute("/photographer-link")({
  head: () => ({
    meta: [
      { title: "Find your Serving Opportunities · Passion Photography Hub" },
      {
        name: "description",
        content:
          "Photographers — enter your email and we'll send you a link to your personal Serving Opportunities page.",
      },
    ],
  }),
  component: PhotographerLinkPage,
});

function PhotographerLinkPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      await fetch("/api/photographer-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {
      // Intentionally swallowed — we always show the same generic success
      // message to avoid leaking which emails are registered.
    }
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <header className="px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="size-9 rounded-full bg-primary flex items-center justify-center overflow-hidden">
            <img
              src={pccLogo}
              alt="Passion"
              className="size-5 object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <span className="font-semibold tracking-tight">Passion Photography Hub</span>
        </Link>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-3" /> Home
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="size-14 rounded-full bg-emerald-500/10 mx-auto flex items-center justify-center">
                <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  If <span className="font-medium text-foreground">{email}</span> is
                  registered as a photographer, we just sent you a link to your
                  personal Serving Opportunities page.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Didn't get it? Check spam, or ask a Passion admin to send you
                  your link directly.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                >
                  Try a different email
                </Button>
                <Link to="/">
                  <Button variant="ghost">Back home</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="size-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-3">
                  <Camera className="size-6 text-primary" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Find your Serving Opportunities
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the email a Passion admin used to register you. We'll
                  email you a link to your personal Serving Opportunities page.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  <Mail className="size-4" />
                  {submitting ? "Sending…" : "Email me my link"}
                </Button>
              </form>

              <p className="mt-6 text-xs text-muted-foreground text-center">
                Not a photographer yet? Ask a Passion admin to add you.
              </p>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
