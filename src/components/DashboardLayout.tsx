import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import posLogoNew from '@/assets/pos-logo-new.png';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLanguage } from '@/contexts/LanguageContext';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { signOut, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const getRoleLabel = (r: string | null): string => {
    if (!r) return '';
    switch (r) {
      case 'owner':
        return 'Owner';
      case 'cashier':
        return 'Cashier';
      case 'kitchen':
        return 'Kitchen';
      case 'system_admin':
        return 'System Admin';
      default:
        return r.replace('_', ' ');
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['profile_header', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Fetch username from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      
      // Fetch role from user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!profileData?.username || !roleData?.role) return null;
      
      return {
        username: profileData.username,
        role: roleData.role
      };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header - cleaner, reduced height */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14">
            {/* LEFT – Brand Area */}
            <div className="flex items-center gap-2.5">
              <img src={posLogoNew} alt="Kastana POS" className="h-8 sm:h-10 w-auto" />
              <span className="text-sm font-semibold text-foreground">
                Kastana POS
              </span>
            </div>

            {/* CENTER – User Display (hidden on mobile) */}
            <div className="hidden md:flex items-center justify-center flex-1">
              {profile?.username ? (
                <span className="text-sm font-medium text-foreground">
                  {profile.username}
                </span>
              ) : null}
            </div>

            {/* RIGHT – Actions Area */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <ThemeToggle />
              <LanguageToggle />
              
              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-border/60 mx-1.5" />
              
              {/* Sign Out */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground h-8 px-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ltr:ml-1.5 rtl:mr-1.5 text-xs">{t("sign_out")}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
