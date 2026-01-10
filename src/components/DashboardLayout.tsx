import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import kastanaLogo from '@/assets/kastana-logo.png';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLanguage } from '@/contexts/LanguageContext';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { signOut, user, role } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const roleLabel = role?.replace('_', ' ') || '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* LEFT – Brand Area */}
            <div className="flex items-center gap-3">
              <img src={kastanaLogo} alt="Kastana POS" className="h-8 sm:h-9 w-auto" />
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-semibold text-foreground leading-tight">
                  Kastana POS
                </span>
                <span className="text-xs text-muted-foreground capitalize leading-tight">
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* CENTER – Page Title (hidden on mobile) */}
            <div className="hidden md:flex items-center justify-center flex-1">
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            </div>

            {/* RIGHT – User Area */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <div className="w-1" /> {/* Separator gap */}
              <LanguageToggle />
              
              {/* Divider */}
              <div className="hidden sm:block w-px h-6 bg-border mx-1" />
              
              {/* User email */}
              <span className="text-sm text-muted-foreground hidden lg:block max-w-[180px] truncate">
                {user?.email}
              </span>
              
              {/* Sign Out */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ltr:ml-1.5 rtl:mr-1.5">{t("sign_out")}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
