/**
 * OwnerChangesBanner Component
 * Shows a lightweight info banner ONLY to Owner role when settings/features changed.
 * Informational only - auto-dismisses after viewing.
 * 
 * SAFETY: This component is READ-ONLY, no logic changes, no API calls.
 */

import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ChangeInfo {
  id: string;
  type: "setting" | "feature" | "menu" | "staff";
  messageAr: string;
  messageEn: string;
  timestamp: number;
}

interface OwnerChangesBannerProps {
  restaurantId: string;
  className?: string;
}

// Storage key for dismissed changes
const DISMISSED_CHANGES_KEY = "kastana_dismissed_changes";

// Get dismissed change IDs from localStorage
function getDismissedChanges(): string[] {
  try {
    const stored = localStorage.getItem(DISMISSED_CHANGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Add a change ID to dismissed list
function dismissChange(changeId: string) {
  const dismissed = getDismissedChanges();
  if (!dismissed.includes(changeId)) {
    dismissed.push(changeId);
    // Keep only last 50 to prevent localStorage bloat
    const trimmed = dismissed.slice(-50);
    localStorage.setItem(DISMISSED_CHANGES_KEY, JSON.stringify(trimmed));
  }
}

/**
 * Check for recent changes that should be shown to owner
 * This is a passive check - no database calls, just local state
 */
function useRecentChanges(restaurantId: string): ChangeInfo[] {
  const [changes, setChanges] = useState<ChangeInfo[]>([]);
  
  useEffect(() => {
    // Check localStorage for pending owner notifications
    // These would be set by other parts of the app when changes occur
    try {
      const pendingKey = `kastana_owner_changes_${restaurantId}`;
      const pending = localStorage.getItem(pendingKey);
      if (pending) {
        const parsed: ChangeInfo[] = JSON.parse(pending);
        const dismissed = getDismissedChanges();
        
        // Filter out already dismissed changes and old ones (>24h)
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const active = parsed.filter(
          c => !dismissed.includes(c.id) && (now - c.timestamp) < twentyFourHours
        );
        
        setChanges(active);
      }
    } catch {
      // Silently fail - this is non-critical
    }
  }, [restaurantId]);
  
  return changes;
}

export function OwnerChangesBanner({ restaurantId, className }: OwnerChangesBannerProps) {
  const { language } = useLanguage();
  const { role } = useAuth();
  const changes = useRecentChanges(restaurantId);
  const [visibleChanges, setVisibleChanges] = useState<ChangeInfo[]>([]);
  
  // Only show to owners
  if (role !== "owner") {
    return null;
  }
  
  // Sync visible changes with fetched changes
  useEffect(() => {
    setVisibleChanges(changes);
  }, [changes]);
  
  // Handle dismiss
  const handleDismiss = (changeId: string) => {
    dismissChange(changeId);
    setVisibleChanges(prev => prev.filter(c => c.id !== changeId));
  };
  
  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (visibleChanges.length === 0) return;
    
    const timer = setTimeout(() => {
      visibleChanges.forEach(c => dismissChange(c.id));
      setVisibleChanges([]);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [visibleChanges]);
  
  if (visibleChanges.length === 0) {
    return null;
  }
  
  const labels = {
    title: language === "ar" ? "تحديث" : "Update",
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {visibleChanges.map((change) => (
        <div
          key={change.id}
          className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="flex-1 text-blue-800 dark:text-blue-200">
            <span className="font-medium">{labels.title}:</span>{" "}
            {language === "ar" ? change.messageAr : change.messageEn}
          </span>
          <button
            onClick={() => handleDismiss(change.id)}
            className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
            aria-label={language === "ar" ? "إغلاق" : "Dismiss"}
          >
            <X className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Utility function to notify owner of a change
 * Call this from settings update handlers
 */
export function notifyOwnerChange(
  restaurantId: string,
  change: Omit<ChangeInfo, "id" | "timestamp">
) {
  try {
    const pendingKey = `kastana_owner_changes_${restaurantId}`;
    const existing = localStorage.getItem(pendingKey);
    const changes: ChangeInfo[] = existing ? JSON.parse(existing) : [];
    
    const newChange: ChangeInfo = {
      ...change,
      id: `${change.type}_${Date.now()}`,
      timestamp: Date.now(),
    };
    
    changes.push(newChange);
    
    // Keep only last 10 changes
    const trimmed = changes.slice(-10);
    localStorage.setItem(pendingKey, JSON.stringify(trimmed));
  } catch {
    // Silently fail - non-critical
  }
}
