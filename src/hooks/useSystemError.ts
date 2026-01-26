/**
 * Hook for showing system errors with current language context
 * 
 * Use this in components that have access to LanguageContext.
 * For components without LanguageContext (like Login), use showSystemError directly.
 */

import { useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { showSystemError, showSystemSuccess, getSystemErrorMessage, SystemErrorResult } from "@/lib/systemErrorHandler";

export function useSystemError() {
  const { language } = useLanguage();
  
  /**
   * Shows a system error toast with the current language
   */
  const showError = useCallback((error: unknown, customTitle?: string) => {
    showSystemError(error, language, customTitle);
  }, [language]);
  
  /**
   * Shows a success toast with the current language
   */
  const showSuccess = useCallback((
    messageKey: "saved" | "created" | "updated" | "deleted" | "completed" | "sent",
    customMessage?: string
  ) => {
    showSystemSuccess(messageKey, language, customMessage);
  }, [language]);
  
  /**
   * Gets the error message object without showing toast
   * Useful for inline error display
   */
  const getErrorMessage = useCallback((error: unknown): SystemErrorResult => {
    return getSystemErrorMessage(error, language);
  }, [language]);
  
  return {
    showError,
    showSuccess,
    getErrorMessage,
    language
  };
}
