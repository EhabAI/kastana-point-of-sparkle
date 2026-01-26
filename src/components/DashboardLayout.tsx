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
export function DashboardLayout({
  children,
  title
}: DashboardLayoutProps) {
  const {
    signOut,
    displayName,
    role
  } = useAuth();
  const {
    t,
    language
  } = useLanguage();

  const navigate = useNavigate();

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
  const handleSignOut = async () => {
    await signOut();
    navigate('/login', {
      replace: true
    });
  };
  return <div className="min-h-screen bg-background">
      {/* Header - compact height */}
      <header className="sticky top-0 z-50 bg-slate-900 dark:bg-slate-950 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-10 sm:h-11">
            {/* LEFT – Brand Area */}
            <div className="flex items-center gap-2">
              <img src={posLogoNew} alt="Kastana POS" className="h-6 sm:h-7 w-auto" />
              <span className="text-xs font-semibold text-white">
                Kastana POS
              </span>
            </div>

            {/* CENTER – User Display (hidden on mobile) */}
            <div className="hidden md:flex items-center justify-center flex-1">
              {displayName && (
                <span className="font-medium text-white/90 text-sm font-sans">
                  {displayName} {role && `- ${formatRole(role)}`}
                </span>
              )}
            </div>

            {/* RIGHT – Actions Area */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LanguageToggle />
              
              {/* Divider */}
              <div className="hidden sm:block w-px h-4 bg-slate-600 mx-1" />
              
              {/* Sign Out */}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-300 hover:text-white hover:bg-slate-800 h-7 px-1.5">
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
    </div>;
}