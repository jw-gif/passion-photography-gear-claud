import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

// Verify the caller is a signed-in admin. Returns the user id, or throws a Response.
async function requireAdmin(request: Request): Promise<string> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Response("Server misconfigured", { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  const userClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const userId = claimsData.claims.sub as string;
  const { data: roleRow, error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleErr || !roleRow) {
    throw new Response("Forbidden", { status: 403 });
  }
  return userId;
}

interface AdminListItem {
  id: string;
  email: string | null;
  display_name: string;
  role: "admin" | "team";
  created_at: string;
  last_sign_in_at: string | null;
}

async function listAdmins(): Promise<AdminListItem[]> {
  const { data: roles, error: rolesErr } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "team"]);
  if (rolesErr) throw new Response(rolesErr.message, { status: 500 });
  if (!roles || roles.length === 0) return [];

  // If a user has both roles, prefer admin.
  const roleByUser = new Map<string, "admin" | "team">();
  for (const r of roles) {
    const cur = roleByUser.get(r.user_id);
    if (cur === "admin") continue;
    roleByUser.set(r.user_id, r.role as "admin" | "team");
  }
  const ids = Array.from(roleByUser.keys());

  const { data: profiles } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, display_name, created_at")
    .in("id", ids);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: usersPage, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (usersErr) throw new Response(usersErr.message, { status: 500 });
  const userMap = new Map(usersPage.users.map((u) => [u.id, u]));

  return ids.map((id) => {
    const u = userMap.get(id);
    const p = profileMap.get(id);
    return {
      id,
      email: u?.email ?? null,
      display_name: p?.display_name ?? "(no name)",
      role: roleByUser.get(id)!,
      created_at: p?.created_at ?? u?.created_at ?? new Date().toISOString(),
      last_sign_in_at: u?.last_sign_in_at ?? null,
    };
  });
}

export const Route = createFileRoute("/api/admins")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAdmin(request);
        const admins = await listAdmins();
        return Response.json({ admins });
      },

      // Create a new admin or team member: { email, display_name, password?, role? }
      POST: async ({ request }) => {
        await requireAdmin(request);
        let body: {
          email?: string;
          display_name?: string;
          password?: string;
          role?: "admin" | "team";
        };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const email = body.email?.trim().toLowerCase();
        const display_name = body.display_name?.trim();
        const password = body.password?.trim();
        const role: "admin" | "team" = body.role === "team" ? "team" : "admin";
        if (!email || !display_name) {
          return Response.json(
            { error: "Email and display name are required" },
            { status: 400 },
          );
        }
        if (display_name.length > 50) {
          return Response.json({ error: "Display name too long (max 50)" }, { status: 400 });
        }
        if (password && password.length < 8) {
          return Response.json(
            { error: "Password must be at least 8 characters" },
            { status: 400 },
          );
        }

        // Create the auth user (email-confirmed so they can sign in immediately).
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: password || undefined,
          email_confirm: true,
        });
        if (createErr || !created.user) {
          return Response.json(
            { error: createErr?.message ?? "Failed to create user" },
            { status: 400 },
          );
        }
        const newId = created.user.id;

        // Insert profile + role.
        const { error: profileErr } = await supabaseAdmin
          .from("admin_profiles")
          .insert({ id: newId, display_name });
        if (profileErr) {
          await supabaseAdmin.auth.admin.deleteUser(newId);
          return Response.json({ error: profileErr.message }, { status: 500 });
        }
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: newId, role });
        if (roleErr) {
          await supabaseAdmin.auth.admin.deleteUser(newId);
          return Response.json({ error: roleErr.message }, { status: 500 });
        }

        return Response.json({
          admin: {
            id: newId,
            email,
            display_name,
            role,
            temporary_password: password || null,
          },
        });
      },

      // PATCH: rename or set password for an existing admin
      // body: { id, display_name?, password? }
      PATCH: async ({ request }) => {
        const callerId = await requireAdmin(request);
        let body: {
          id?: string;
          display_name?: string;
          password?: string;
          role?: "admin" | "team";
        };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const id = body.id;
        if (!id) return Response.json({ error: "id is required" }, { status: 400 });

        if (body.display_name !== undefined) {
          const dn = body.display_name.trim();
          if (!dn) return Response.json({ error: "Display name can't be empty" }, { status: 400 });
          if (dn.length > 50) return Response.json({ error: "Display name too long" }, { status: 400 });
          const { error } = await supabaseAdmin
            .from("admin_profiles")
            .update({ display_name: dn })
            .eq("id", id);
          if (error) return Response.json({ error: error.message }, { status: 500 });
        }

        if (body.password !== undefined) {
          const pw = body.password.trim();
          if (pw.length < 8) {
            return Response.json(
              { error: "Password must be at least 8 characters" },
              { status: 400 },
            );
          }
          const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: pw });
          if (error) return Response.json({ error: error.message }, { status: 500 });
        }

        if (body.role !== undefined) {
          const newRole: "admin" | "team" = body.role === "team" ? "team" : "admin";
          // Don't let the caller demote themselves (would lock them out of admin tools).
          if (id === callerId && newRole !== "admin") {
            return Response.json(
              { error: "You can't change your own role" },
              { status: 400 },
            );
          }
          // If we're moving someone OUT of admin, make sure they're not the last one.
          if (newRole !== "admin") {
            const { data: admins, error: aErr } = await supabaseAdmin
              .from("user_roles")
              .select("user_id")
              .eq("role", "admin");
            if (aErr) return Response.json({ error: aErr.message }, { status: 500 });
            const isAdmin = (admins ?? []).some((r) => r.user_id === id);
            if (isAdmin && (admins?.length ?? 0) <= 1) {
              return Response.json(
                { error: "Can't demote the last admin" },
                { status: 400 },
              );
            }
          }
          // Replace any existing admin/team role with the new one.
          const { error: delErr } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", id)
            .in("role", ["admin", "team"]);
          if (delErr) return Response.json({ error: delErr.message }, { status: 500 });
          const { error: insErr } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: id, role: newRole });
          if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
        }

        return Response.json({ ok: true });
      },

      // DELETE: remove an admin entirely
      // body: { id }
      DELETE: async ({ request }) => {
        const callerId = await requireAdmin(request);
        let body: { id?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const id = body.id;
        if (!id) return Response.json({ error: "id is required" }, { status: 400 });
        if (id === callerId) {
          return Response.json(
            { error: "You can't remove your own account" },
            { status: 400 },
          );
        }

        // Make sure we're not removing the last admin.
        const { data: roles, error: rolesErr } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (rolesErr) return Response.json({ error: rolesErr.message }, { status: 500 });
        if ((roles?.length ?? 0) <= 1) {
          return Response.json(
            { error: "Can't remove the last admin" },
            { status: 400 },
          );
        }

        // Cascade: deleting the auth user removes user_roles + admin_profiles via FK cascade.
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (delErr) return Response.json({ error: delErr.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
