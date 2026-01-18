import { Button } from "@/components/ui/button";
import { Home, LogOut, RefreshCw, Volume2, VolumeX, Clock, Settings2, Maximize, Minimize } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import posLogoNew from "@/assets/pos-logo-new.png";
import { AutoClearDelay } from "@/hooks/kds/useKDSAutoClear";

interface KDSHeaderProps {
  restaurantName?: string;
  restaurantLogo?: string | null;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  autoClearEnabled: boolean;
  autoClearDelay: AutoClearDelay;
  onAutoClearToggle: () => void;
  onAutoClearDelayChange: (delay: AutoClearDelay) => void;
  isRefetching: boolean;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/**
 * KDSHeader - Reuses the system header visual style with KDS-specific restrictions
 * 
 * SECURITY RULES:
 * - Shows only: Language toggle, Theme toggle, Home button (role-aware)
 * - Hidden: Sidebar toggle, POS navigation, Reports, Settings, User management
 * - Home button: Owner → Dashboard, Kitchen → Logout
 * - Cashier/System Admin: Home button hidden (should never reach KDS)
 */
export function KDSHeader({
  restaurantName,
  restaurantLogo,
  soundEnabled,
  onSoundToggle,
  autoClearEnabled,
  autoClearDelay,
  onAutoClearToggle,
  onAutoClearDelayChange,
  isRefetching,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
}: KDSHeaderProps) {
  const { t, language } = useLanguage();
  const { user, role, displayName, signOut } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === "ar";

  // Role-based navigation
  const isOwner = role === "owner";
  const isKitchen = role === "kitchen";
  const isCashier = role === "cashier";
  const isSystemAdmin = role === "system_admin";
  
  // Home button visible for owner only (kitchen stays on KDS)
  const showHomeButton = isOwner;

  // Get home destination based on role
  const getHomeDestination = () => {
    if (isSystemAdmin) return "/system-admin";
    if (isOwner) return "/owner";
    if (isCashier) return "/pos";
    return "/kds"; // kitchen
  };

  const handleHomeClick = () => {
    navigate(getHomeDestination(), { replace: true });
  };

  // Sign out handler - ALWAYS available for any role
  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/60">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-12 sm:h-14">
          {/* LEFT – Brand Area */}
          <div className="flex items-center gap-2.5">
            <img 
              src={restaurantLogo || posLogoNew} 
              alt={restaurantName || "Kastana POS"}
              className="h-8 sm:h-10 w-auto object-contain rounded-lg"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground leading-tight">
                {restaurantName || "Kastana POS"}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                {t("kitchen_display")}
              </span>
            </div>
          </div>

          {/* RIGHT – Actions Area */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Sound Toggle */}
            <Button
              variant={soundEnabled ? "default" : "outline"}
              size="sm"
              onClick={onSoundToggle}
              title={soundEnabled ? t("sound_on") : t("sound_off")}
              className="h-8 px-2"
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFullscreen}
              title={isFullscreen ? t("exit_fullscreen") : t("enter_fullscreen")}
              className="h-8 px-2"
            >
              {isFullscreen ? (
                <Minimize className="h-3.5 w-3.5" />
              ) : (
                <Maximize className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-56">
                <DropdownMenuLabel>{t("kds_settings")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Auto-clear Toggle */}
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t("auto_clear_ready")}</span>
                  </div>
                  <Switch
                    checked={autoClearEnabled}
                    onCheckedChange={onAutoClearToggle}
                  />
                </div>
                
                {autoClearEnabled && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {t("clear_after")}
                    </DropdownMenuLabel>
                    {([3, 5, 10] as AutoClearDelay[]).map((delay) => (
                      <DropdownMenuItem
                        key={delay}
                        onClick={() => onAutoClearDelayChange(delay)}
                        className="flex items-center justify-between"
                      >
                        <span>{delay} {t("minutes")}</span>
                        {autoClearDelay === delay && (
                          <Badge variant="secondary" className="text-xs">
                            {t("selected")}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefetching}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>

            {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-border/60 mx-1.5" />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language Toggle */}
            <LanguageToggle />

          {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-border/60 mx-1.5" />

            {/* Current User - Display Name + Role */}
            {user && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground px-2">
                <span className="truncate max-w-[150px] capitalize" title={displayName || user.email}>
                  {displayName ? `${displayName} - ${role?.replace('_', ' ')}` : user.email}
                </span>
              </div>
            )}

            {/* Home Button - Owner only */}
            {showHomeButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHomeClick}
                className="text-muted-foreground hover:text-foreground h-8 px-2"
                title={t("dashboard")}
              >
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ltr:ml-1.5 rtl:mr-1.5 text-xs">
                  {t("dashboard")}
                </span>
              </Button>
            )}

            {/* Sign Out Button - ALWAYS visible for ANY role */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive h-8 px-2"
              title={t("sign_out")}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ltr:ml-1.5 rtl:mr-1.5 text-xs">
                {t("sign_out")}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
