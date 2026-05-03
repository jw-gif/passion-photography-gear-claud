import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  displayName: string | null;
  isAdmin: boolean;
  isTeam: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdminFlag, setIsAdminFlag] = useState(false);
  const [isTeamFlag, setIsTeamFlag] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from("admin_profiles").select("display_name").eq("id", uid).maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid),
    ]);
    setDisplayName(profile?.display_name ?? null);
    const roles = (roleRows ?? []).map((r) => r.role);
    const admin = roles.includes("admin");
    const team = admin || roles.includes("team");
    setIsAdminFlag(admin);
    setIsTeamFlag(team);
  }

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer to avoid deadlock; keep loading true until roles resolve
        setLoading(true);
        setTimeout(() => {
          loadProfile(newSession.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setDisplayName(null);
        setIsAdminFlag(false);
        setIsTeamFlag(false);
        setLoading(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadProfile(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        displayName,
        isAdmin: isAdminFlag,
        isTeam: isTeamFlag,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
