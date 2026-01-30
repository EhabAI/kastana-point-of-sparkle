import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRestaurantContextSafe } from '@/contexts/RestaurantContext';
import { RestaurantSwitcher } from '@/components/owner/RestaurantSwitcher';
import kastanaLogo from '@/assets/pos-logo-new.png';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export function DashboardLayout({
  children,
  title
}: DashboardLayoutProps) {
  const { signOut, displayName, role } = useAuth();
  const { t, language } = useLanguage();
  const { selectedRestaurant } = useRestaurantContextSafe();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isSystemAdmin = location.pathname === '/system-admin';
  const isOwner = role === 'owner';

  const formatRole = (roleValue: string | null) => {
    if (!roleValue) return '';
    const roleTranslations: Record<string, string> = {
      system_admin: 'مدير النظام',
      owner: 'صاحب المطعم',
      cashier: 'كاشيير',
      kitchen: 'المطبخ'
    };
    if (language === 'ar') {
      return roleTranslations[roleValue] || roleValue;
    }
    return roleValue.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Generate initials from restaurant name (first 2 letters)
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - minimal height */}
      <header className="sticky top-0 z-50 bg-blue-100 dark:bg-blue-900/40 backdrop-blur-sm border-b border-blue-200 dark:border-blue-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9">
            {/* LEFT – Logo & Restaurant Name (or Kastana Logo for System Admin) */}
            <div className="flex items-center gap-2">
              {isSystemAdmin ? (
                <img 
                  src={kastanaLogo} 
                  alt="Kastana POS" 
                  className="h-6 object-contain"
                />
              ) : isOwner ? (
                <RestaurantSwitcher />
              ) : (
                <>
                  {selectedRestaurant?.logo_url ? (
                    <img 
                      src={selectedRestaurant.logo_url} 
                      alt={selectedRestaurant.name} 
                      className="h-6 w-6 object-contain rounded-md"
                    />
                  ) : selectedRestaurant?.name ? (
                    <div className="h-6 w-6 rounded-md bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">
                        {getInitials(selectedRestaurant.name)}
                      </span>
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-md bg-blue-200 dark:bg-blue-800" />
                  )}
                  {selectedRestaurant?.name && (
                    <span className="text-xs font-semibold text-blue-900 dark:text-blue-100 truncate max-w-[120px] sm:max-w-[200px]">
                      {selectedRestaurant.name}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* CENTER – User Context (hidden on mobile) */}
            <div className="hidden md:flex items-center justify-center flex-1">
              {displayName && (
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-100">
                  {displayName} {role && `• ${formatRole(role)}`}
                </span>
              )}
            </div>

            {/* RIGHT – Actions */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LanguageToggle />
              
              {/* Divider */}
              <div className="hidden sm:block w-px h-4 bg-blue-300 dark:bg-blue-700 mx-1" />
              
              {/* Sign Out */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut} 
                className="text-blue-700 dark:text-blue-200 hover:text-blue-900 dark:hover:text-white hover:bg-blue-200 dark:hover:bg-blue-800 h-6 px-1.5"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden sm:inline ltr:ml-1 rtl:mr-1 text-[11px]">{t("sign_out")}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - reduced top padding */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6">
        {children}
      </main>
    </div>
  );
}