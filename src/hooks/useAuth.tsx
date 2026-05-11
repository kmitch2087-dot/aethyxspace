import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  adminChecked: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminChecked, setAdminChecked] = useState(false);
  const adminCheckRef = useRef<string | null>(null);
  const adminResultRef = useRef(false);

  const checkAdmin = useCallback(async (userId: string): Promise<boolean> => {
    // If we already resolved this user, return cached result
    if (adminCheckRef.current === userId) return adminResultRef.current;
    adminCheckRef.current = userId;
    // New user being checked — mark check as pending so consumers wait
    setAdminChecked(false);
    setIsAdmin(false);
    adminResultRef.current = false;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (adminCheckRef.current !== userId) return false; // stale
      const result = !error && !!data;
      adminResultRef.current = result;
      setIsAdmin(result);
      setAdminChecked(true);
      return result;
    } catch {
      if (adminCheckRef.current === userId) {
        adminResultRef.current = false;
        setIsAdmin(false);
        setAdminChecked(true);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const processSession = async (newSession: Session | null) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await checkAdmin(newSession.user.id);
      } else {
        adminCheckRef.current = null;
        setIsAdmin(false);
        setAdminChecked(true);
      }

      if (mounted) setLoading(false);
    };

    // 1. Set up listener FIRST (captures events during getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        // Don't block the callback — process async
        processSession(newSession);
      }
    );

    // 2. Hydrate current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      processSession(currentSession);
    }).catch(() => {
      if (mounted) {
        setLoading(false);
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdmin]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    adminCheckRef.current = null;
    adminResultRef.current = false;
    setIsAdmin(false);
    setAdminChecked(false);
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, adminChecked, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
