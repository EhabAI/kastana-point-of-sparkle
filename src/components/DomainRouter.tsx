/**
 * Domain-Based Router for Kastana POS
 * 
 * Handles routing based on the current domain:
 * - pos.kastana.info: Full POS system (login, admin, owner, cashier, kitchen)
 * - qrmenu.kastana.info: Customer QR menu only (/menu/**)
 * 
 * Legacy/preview domains continue to work with full access for development.
 */

import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Domain configuration
const DOMAINS = {
  POS: "pos.kastana.info",
  QR_MENU: "qrmenu.kastana.info",
} as const;

// Routes allowed on QR menu domain
const QR_MENU_ALLOWED_ROUTES = ["/menu"];

interface DomainRouterProps {
  children: ReactNode;
  qrMenuFallback?: ReactNode;
}

/**
 * Checks if the current domain is the QR menu domain
 */
export function isQRMenuDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname === DOMAINS.QR_MENU;
}

/**
 * Checks if the current domain is the POS domain
 */
export function isPOSDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname === DOMAINS.POS;
}

/**
 * Checks if route is allowed on QR menu domain
 */
function isAllowedOnQRMenu(pathname: string): boolean {
  return QR_MENU_ALLOWED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Gets the appropriate base URL for QR menu links
 */
export function getQRMenuBaseURL(): string {
  return `https://${DOMAINS.QR_MENU}`;
}

/**
 * Gets the appropriate base URL for POS links
 */
export function getPOSBaseURL(): string {
  return `https://${DOMAINS.POS}`;
}

/**
 * QR Menu Restricted Page - shown when accessing non-menu routes on qrmenu domain
 */
function QRMenuRestrictedPage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Auto-redirect to /menu after a short delay
    const timer = setTimeout(() => {
      navigate("/menu", { replace: true });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="text-center max-w-md">
        {/* Logo or Brand */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-primary" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
              />
            </svg>
          </div>
        </div>
        
        {/* Message */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          QR Menu Only
        </h1>
        <p className="text-muted-foreground mb-6">
          This domain is for customer menu access only.
          <br />
          Redirecting to menu...
        </p>
        
        {/* Loading indicator */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        
        {/* Manual redirect link */}
        <p className="mt-6 text-sm text-muted-foreground">
          <a 
            href="/menu" 
            className="text-primary hover:underline"
          >
            Click here if not redirected
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Domain Router Component
 * 
 * Wraps the app routes and enforces domain-based access control:
 * - On qrmenu.kastana.info: Only /menu/** routes are accessible
 * - On pos.kastana.info: Full access to all routes
 * - On other domains (preview, localhost): Full access (development)
 */
export function DomainRouter({ children, qrMenuFallback }: DomainRouterProps) {
  const location = useLocation();
  const [shouldBlock, setShouldBlock] = useState(false);
  
  useEffect(() => {
    // Check if we're on QR menu domain and trying to access non-menu routes
    if (isQRMenuDomain() && !isAllowedOnQRMenu(location.pathname)) {
      setShouldBlock(true);
    } else {
      setShouldBlock(false);
    }
  }, [location.pathname]);
  
  // If blocked on QR menu domain, show restricted page or custom fallback
  if (shouldBlock) {
    return qrMenuFallback || <QRMenuRestrictedPage />;
  }
  
  return <>{children}</>;
}

/**
 * Hook to get current domain context
 */
export function useDomainContext() {
  const [domainInfo, setDomainInfo] = useState(() => ({
    isQRMenu: isQRMenuDomain(),
    isPOS: isPOSDomain(),
    isDevelopment: !isQRMenuDomain() && !isPOSDomain(),
    hostname: window.location.hostname,
  }));
  
  return domainInfo;
}
