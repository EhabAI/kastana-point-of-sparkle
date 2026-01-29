import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOwnerRestaurant } from '@/hooks/useRestaurants';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export function DashboardLayout({
  children,
  title
}: DashboardLayoutProps) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const navigate = useNavigate();

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
            {/* LEFT – Logo & Restaurant Name */}
            <div className="flex items-center gap-2">
              {restaurant?.logo_url ? (
                <img 
                  src={restaurant.logo_url} 
                  alt={restaurant.name} 
                  className="h-6 w-6 object-contain rounded-md"
                />
              ) : restaurant?.name ? (
                <div className="h-6 w-6 rounded-md bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">
                    {getInitials(restaurant.name)}
                  </span>
                </div>
              ) : (
                <div className="h-6 w-6 rounded-md bg-blue-200 dark:bg-blue-800" />
              )}
              {restaurant?.name && (
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-100 truncate max-w-[120px] sm:max-w-[200px]">
                  {restaurant.name}
                </span>
              )}
            </div>

            {/* RIGHT – Actions Area */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}