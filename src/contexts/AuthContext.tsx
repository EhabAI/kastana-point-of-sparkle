import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "system_admin" | "owner" | "cashier" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  isActive: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [isActive, setIsActive] = useState(true);

  // 🔒 loading يبقى true إلى أن نحدد الدور بشكل نهائي
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user role:", error);
      return { role: null as AppRole, isActive: true };
    }

    // كاشيير غير نشط → ممنوع الدخول
    if (data?.role === "cashier" && data?.is_active === false) {
      return { role: null as AppRole, isActive: false };
    }

    return {
      role: (data?.role as AppRole) ?? null,
      isActive: data?.is_active ?? true,
    };
  };

  const hydrateAuth = async (session: Session | null) => {
    setSession(session);
    setUser(session?.user ?? null);

    if (!session?.user) {
      setRole(null);
      setIsActive(true);
      setLoading(false);
      return;
    }

    const { role, isActive } = await fetchUserRole(session.user.id);
    setRole(role);
    setIsActive(isActive);
    setLoading(false);
  };

  useEffect(() => {
    // 1️⃣ تحميل الجلسة الحالية
    supabase.auth.getSession().then(({ data }) => {
      hydrateAuth(data.session);
    });

    // 2️⃣ الاستماع لتغييرات المصادقة
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateAuth(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setIsActive(true);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isActive,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
