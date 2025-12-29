import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'system_admin' | 'owner' | 'cashier' | null;

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
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string): Promise<{ role: AppRole; isActive: boolean }> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return { role: null, isActive: true };
    }
    
    // If cashier is inactive, block access by returning null role
    if (data?.role === 'cashier' && data?.is_active === false) {
      return { role: null, isActive: false };
    }
    
    return { role: data?.role as AppRole, isActive: data?.is_active ?? true };
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer role fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(({ role, isActive }) => {
              setRole(role);
              setIsActive(isActive);
            });
          }, 0);
        } else {
          setRole(null);
          setIsActive(true);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(({ role, isActive }) => {
          setRole(role);
          setIsActive(isActive);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setIsActive(true);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, isActive, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
