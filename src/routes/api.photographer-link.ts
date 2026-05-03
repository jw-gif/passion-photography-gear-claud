import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SUCCESS_MESSAGE =
  "If that email is registered, we just sent you a link.";

interface RequestBody {
  email?: string;
}

export const Route = createFileRoute("/api/photographer-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: RequestBody;
        try {
          body = (await request.json()) as RequestBody;
        } catch {
          // Always return generic success — don't leak parsing errors either.
          return Response.json({ ok: true, message: SUCCESS_MESSAGE });
        }

        const email = (body.email ?? "").trim().toLowerCase();
        if (!email || !email.includes("@")) {
          return Response.json({ ok: true, message: SUCCESS_MESSAGE });
        }

        // Look up the photographer (case-insensitive). Always return the same
        // generic success message regardless of result to avoid leaking which
        // emails are registered.
        const { data: photographer } = await supabaseAdmin
          .from("photographers")
          .select("id, name, email, token, active")
          .ilike("email", email)
          .eq("active", true)
          .maybeSingle();

        if (!photographer) {
          return Response.json({ ok: true, message: SUCCESS_MESSAGE });
        }

        // Build the magic link from the request origin.
        const origin = new URL(request.url).origin;
        const magicLink = `${origin}/jobs?t=${photographer.token}`;

        // Send the email via Lovable Emails infrastructure.
        // The send-transactional-email server route handles enqueueing,
        // suppression checks, retries, and logging.
        try {
          await fetch(`${origin}/lovable/email/transactional/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Internal call — use service role auth.
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
            },
            body: JSON.stringify({
              templateName: "photographer-link",
              recipientEmail: photographer.email,
              idempotencyKey: `photographer-link-${photographer.id}-${Date.now()}`,
              templateData: {
                name: photographer.name,
                magicLink,
              },
            }),
          });
        } catch (err) {
          // Log but never reveal failure to the client.
          console.error("Failed to enqueue photographer link email:", err);
        }

        return Response.json({ ok: true, message: SUCCESS_MESSAGE });
      },
    },
  },
});
