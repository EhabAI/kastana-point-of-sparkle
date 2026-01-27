/**
 * Kastana POS - In-Flow Intelligence Hook
 * React hook for accessing in-flow intelligence features
 */

import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  type SensitiveActionKey,
  type ActionCompletedKey,
  type BlockReasonKey,
  getBlockExplanation,
  detectBlockReason,
  getFirstTimeCoaching,
  markActionCompleted,
  isFirstTimeAction,
  getNextActionSuggestion,
  canRolePerformAction,
  getRoleRestrictionMessage,
} from "@/lib/assistantInFlowIntelligence";

// Storage key for dismissed next action suggestions
const DISMISSED_SUGGESTIONS_KEY = "kastana_dismissed_next_actions";

// Get dismissed suggestions from localStorage
function getDismissedSuggestions(): ActionCompletedKey[] {
  try {
    const stored = localStorage.getItem(DISMISSED_SUGGESTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Dismiss a suggestion
function dismissSuggestion(action: ActionCompletedKey): void {
  const dismissed = getDismissedSuggestions();
  if (!dismissed.includes(action)) {
    dismissed.push(action);
    localStorage.setItem(DISMISSED_SUGGESTIONS_KEY, JSON.stringify(dismissed));
  }
}

export interface UseInFlowIntelligenceReturn {
  // Silent Rule Explainer
  getBlockMessage: (reasonKey: BlockReasonKey) => string;
  detectBlock: (conditions: Parameters<typeof detectBlockReason>[0]) => BlockReasonKey | null;
  
  // First-Time Action Coach
  showCoaching: (actionKey: SensitiveActionKey) => {
    title: string;
    steps: string[];
  } | null;
  completeAction: (actionKey: SensitiveActionKey) => void;
  isFirstTime: (actionKey: SensitiveActionKey) => boolean;
  
  // Suggested Next Action
  getNextSuggestion: (completedAction: ActionCompletedKey) => string | null;
  dismissNextSuggestion: (action: ActionCompletedKey) => void;
  
  // Active suggestion state
  activeSuggestion: { action: ActionCompletedKey; message: string } | null;
  showSuggestionFor: (action: ActionCompletedKey) => void;
  clearSuggestion: () => void;
  
  // Role checks
  canPerform: (action: SensitiveActionKey) => boolean;
  getRoleMessage: (action: SensitiveActionKey) => string | null;
}

export function useInFlowIntelligence(): UseInFlowIntelligenceReturn {
  const { language } = useLanguage();
  const { role } = useAuth();
  
  // Active next action suggestion
  const [activeSuggestion, setActiveSuggestion] = useState<{
    action: ActionCompletedKey;
    message: string;
  } | null>(null);
  
  // Auto-clear suggestion after 8 seconds
  useEffect(() => {
    if (activeSuggestion) {
      const timer = setTimeout(() => {
        setActiveSuggestion(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeSuggestion]);
  
  // Silent Rule Explainer
  const getBlockMessage = useCallback(
    (reasonKey: BlockReasonKey): string => {
      return getBlockExplanation(reasonKey, language);
    },
    [language]
  );
  
  const detectBlock = useCallback(
    (conditions: Parameters<typeof detectBlockReason>[0]): BlockReasonKey | null => {
      return detectBlockReason(conditions);
    },
    []
  );
  
  // First-Time Action Coach
  const showCoaching = useCallback(
    (actionKey: SensitiveActionKey) => {
      return getFirstTimeCoaching(actionKey, language);
    },
    [language]
  );
  
  const completeAction = useCallback((actionKey: SensitiveActionKey) => {
    markActionCompleted(actionKey);
  }, []);
  
  const isFirstTime = useCallback((actionKey: SensitiveActionKey): boolean => {
    return isFirstTimeAction(actionKey);
  }, []);
  
  // Suggested Next Action
  const getNextSuggestion = useCallback(
    (completedAction: ActionCompletedKey): string | null => {
      const dismissed = getDismissedSuggestions();
      if (dismissed.includes(completedAction)) {
        return null;
      }
      return getNextActionSuggestion(completedAction, language);
    },
    [language]
  );
  
  const dismissNextSuggestion = useCallback((action: ActionCompletedKey) => {
    dismissSuggestion(action);
    if (activeSuggestion?.action === action) {
      setActiveSuggestion(null);
    }
  }, [activeSuggestion]);
  
  const showSuggestionFor = useCallback(
    (action: ActionCompletedKey) => {
      const message = getNextSuggestion(action);
      if (message) {
        setActiveSuggestion({ action, message });
      }
    },
    [getNextSuggestion]
  );
  
  const clearSuggestion = useCallback(() => {
    setActiveSuggestion(null);
  }, []);
  
  // Role checks
  const canPerform = useCallback(
    (action: SensitiveActionKey): boolean => {
      return canRolePerformAction(role || "", action);
    },
    [role]
  );
  
  const getRoleMessage = useCallback(
    (action: SensitiveActionKey): string | null => {
      return getRoleRestrictionMessage(action, role || "", language);
    },
    [role, language]
  );
  
  return {
    // Silent Rule Explainer
    getBlockMessage,
    detectBlock,
    
    // First-Time Action Coach
    showCoaching,
    completeAction,
    isFirstTime,
    
    // Suggested Next Action
    getNextSuggestion,
    dismissNextSuggestion,
    activeSuggestion,
    showSuggestionFor,
    clearSuggestion,
    
    // Role checks
    canPerform,
    getRoleMessage,
  };
}
