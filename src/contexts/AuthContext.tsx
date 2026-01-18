import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "system_admin" | "owner" | "cashier" | "kitchen" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  displayName: string | null;
  isActive: boolean;
  restaurantId: string | null;
  isRestaurantActive: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkRestaurantStatus: () => Promise<void>;
  refreshDisplayName: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isRestaurantActive, setIsRestaurantActive] = useState(true);

  // 🔒 loading يبقى true إلى أن نحدد الدور بشكل نهائي
  const [loading, setLoading] = useState(true);

  const fetchDisplayName = async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching display name:", error);
      return null;
    }
    
  };

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role, is_active, restaurant_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user role:", error);
      return { role: null as AppRole, isActive: true, restaurantId: null };
    }

    // كاشيير غير نشط → ممنوع الدخول
    if (data?.role === "cashier" && data?.is_active === false) {
      return { role: null as AppRole, isActive: false, restaurantId: data?.restaurant_id || null };
    }

    // Owner غير نشط → ممنوع الدخول
    if (data?.role === "owner" && data?.is_active === false) {
      return { role: null as AppRole, isActive: false, restaurantId: data?.restaurant_id || null };
    }

    // Kitchen غير نشط → ممنوع الدخول
    if (data?.role === "kitchen" && data?.is_active === false) {
      return { role: null as AppRole, isActive: false, restaurantId: data?.restaurant_id || null };
    }

    return {
      role: (data?.role as AppRole) ?? null,
      isActive: data?.is_active ?? true,
      restaurantId: data?.restaurant_id || null,
    };
  };

  const fetchRestaurantActiveStatus = async (restId: string | null): Promise<boolean> => {
    if (!restId) return true;

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("is_active")
        .eq("id", restId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching restaurant status:", error);
        return true;
      }

      return data?.is_active ?? true;
    } catch (e) {
      console.error("Exception fetching restaurant status:", e);
      return true;
    }
  };

  const handleInactiveRestaurant = useCallback(async () => {
    // Set flag so Login page can show message
    sessionStorage.setItem("logout_reason", "RESTAURANT_INACTIVE");
    
    // Force sign out
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setDisplayName(null);
    setIsActive(true);
    setRestaurantId(null);
    setIsRestaurantActive(true);
    setLoading(false);
  }, []);

  const checkRestaurantStatus = useCallback(async () => {
    if (!restaurantId || role === "system_admin") return;
    
    const restaurantActive = await fetchRestaurantActiveStatus(restaurantId);
    setIsRestaurantActive(restaurantActive);
    
    if (!restaurantActive && (role === "owner" || role === "cashier" || role === "kitchen")) {
      await handleInactiveRestaurant();
    }
  }, [restaurantId, role, handleInactiveRestaurant]);

  const hydrateAuth = async (session: Session | null) => {
    setSession(session);
    setUser(session?.user ?? null);

    if (!session?.user) {
      setRole(null);
      setDisplayName(null);
      setIsActive(true);
      setRestaurantId(null);
      setIsRestaurantActive(true);
      setLoading(false);
      return;
    }

    const { role, isActive, restaurantId } = await fetchUserRole(session.user.id);
    setRole(role);
    setIsActive(isActive);
    setRestaurantId(restaurantId);

    // Fetch display name from profiles
    const name = await fetchDisplayName(session.user.id);
    setDisplayName(name);

    // For owners and cashiers, check restaurant active status
    if ((role === "owner" || role === "cashier" || role === "kitchen") && restaurantId) {
      const restaurantActive = await fetchRestaurantActiveStatus(restaurantId);
      setIsRestaurantActive(restaurantActive);

      // If restaurant is inactive, sign out immediately
      if (!restaurantActive) {
        console.log("Restaurant is inactive, signing out user");
        await handleInactiveRestaurant();
        return;
      }
    } else {
      setIsRestaurantActive(true);
    }

    setLoading(false);
  };

  const refreshDisplayName = useCallback(async () => {
    if (!user?.id) return;
    const name = await fetchDisplayName(user.id);
    setDisplayName(name);
  }, [user?.id]);

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

  // Periodic check for restaurant status (every 60 seconds)
  useEffect(() => {
    if (!restaurantId || role === "system_admin" || !user) return;

    const intervalId = setInterval(() => {
      checkRestaurantStatus();
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [restaurantId, role, user, checkRestaurantStatus]);

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
    setDisplayName(null);
    setIsActive(true);
    setRestaurantId(null);
    setIsRestaurantActive(true);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        displayName,
        isActive,
        restaurantId,
        isRestaurantActive,
        loading,
        signIn,
        signOut,
        checkRestaurantStatus,
        refreshDisplayName,
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
