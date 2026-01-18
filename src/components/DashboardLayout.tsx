import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  const { signOut, user, role, displayName } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const getRoleLabel = (r: string | null) => {
    switch (r) {
      case 'owner': return 'Owner';
      case 'cashier': return 'Cashier';
      case 'kitchen': return 'Kitchen';
      case 'system_admin': return 'System Admin';
      default: return r?.replace('_', ' ') || '';
    }
  };
  const roleLabel = getRoleLabel(role);

  return (
    <div className="min-h-screen bg-background">
      {/* Header - cleaner, reduced height */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14">
            {/* LEFT – Brand Area */}
            <div className="flex items-center gap-2.5">
              <img src={posLogoNew} alt="Kastana POS" className="h-8 sm:h-10 w-auto" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground leading-tight">
                  Kastana POS
                </span>
                <span className="text-[11px] text-muted-foreground capitalize leading-tight">
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* CENTER – Page Title (hidden on mobile) */}
            <div className="hidden md:flex items-center justify-center flex-1">
              <h1 className="text-base font-medium text-foreground">{title}</h1>
            </div>

            {/* RIGHT – User Area */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <ThemeToggle />
              <LanguageToggle />
              
              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-border/60 mx-1.5" />
              
              {/* User display name and role - single line */}
              {displayName && roleLabel && (
                <span className="hidden sm:block text-xs text-muted-foreground max-w-[200px] truncate">
                  {displayName} – {roleLabel}
                </span>
              )}
              
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
