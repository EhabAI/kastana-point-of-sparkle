/**
 * Error Explain Button Component
 * 
 * Displays a button that opens the Smart Assistant with error context.
 * Used throughout the app to provide consistent error explanation UX.
 */

import { Button } from "@/components/ui/button";
import { Brain, HelpCircle } from "lucide-react";
import { useErrorContext, type ErrorSource } from "@/contexts/ErrorContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface ErrorExplainButtonProps {
  /** The error code to explain */
  errorCode?: string;
  /** The source of the error */
  source: ErrorSource;
  /** The error message */
  message: string;
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
  /** Optional raw error object */
  rawError?: unknown;
  /** Button variant */
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional class names */
  className?: string;
  /** Show icon only (compact mode) */
  iconOnly?: boolean;
  /** Custom button text */
  text?: string;
}

/**
 * Button that captures an error and opens the Smart Assistant for explanation.
 * 
 * Usage:
 * ```tsx
 * <ErrorExplainButton
 *   source="csv_inventory"
 *   errorCode="BRANCH_NOT_FOUND"
 *   message="Branch 'Main' not found"
 * />
 * ```
 */
export function ErrorExplainButton({
  errorCode = "UNKNOWN",
  source,
  message,
  metadata,
  rawError,
  variant = "outline",
  size = "sm",
  className,
  iconOnly = false,
  text
}: ErrorExplainButtonProps) {
  const { captureError, requestExplanation } = useErrorContext();
  const { language } = useLanguage();

  const handleClick = () => {
    // Capture the error
    captureError({
      error_code: errorCode,
      source,
      message,
      metadata,
      rawError
    });
    
    // Request explanation (opens Smart Assistant)
    requestExplanation();
  };

  const buttonText = text || (language === "ar" ? "🧠 شرح الخطأ" : "🧠 Explain Error");

  if (iconOnly) {
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={handleClick}
        className={cn("h-8 w-8", className)}
        title={buttonText}
      >
        <Brain className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "gap-1.5",
        language === "ar" ? "flex-row-reverse" : "",
        className
      )}
    >
      <Brain className="h-4 w-4" />
      <span>{buttonText}</span>
    </Button>
  );
}

/**
 * Inline error message with explain button
 * 
 * Usage:
 * ```tsx
 * <ErrorWithExplain
 *   source="payment"
 *   errorCode="ORDER_HELD"
 *   message="الطلب معلق"
 * />
 * ```
 */
interface ErrorWithExplainProps extends ErrorExplainButtonProps {
  /** Show full message inline */
  showMessage?: boolean;
}

export function ErrorWithExplain({
  showMessage = true,
  message,
  ...props
}: ErrorWithExplainProps) {
  const { language } = useLanguage();
  
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30",
      language === "ar" ? "flex-row-reverse" : ""
    )}>
      <HelpCircle className="h-4 w-4 text-destructive shrink-0" />
      {showMessage && (
        <span className="text-sm text-destructive flex-1 truncate">{message}</span>
      )}
      <ErrorExplainButton
        {...props}
        message={message}
        variant="ghost"
        size="sm"
        className="text-primary hover:text-primary shrink-0"
      />
    </div>
  );
}

/**
 * Hook to capture and explain errors in one call
 * 
 * Usage:
 * ```tsx
 * const { explainError } = useErrorExplain();
 * 
 * try {
 *   await someOperation();
 * } catch (error) {
 *   explainError({
 *     source: "payment",
 *     errorCode: "PAYMENT_FAILED",
 *     message: "Payment failed",
 *     rawError: error
 *   });
 * }
 * ```
 */
export function useErrorExplain() {
  const { captureError, requestExplanation, lastError, getErrorExplanation } = useErrorContext();

  const explainError = (params: {
    error_code: string;
    source: ErrorSource;
    message: string;
    metadata?: Record<string, unknown>;
    rawError?: unknown;
    autoOpen?: boolean;
  }) => {
    const error = captureError({
      error_code: params.error_code,
      source: params.source,
      message: params.message,
      metadata: params.metadata,
      rawError: params.rawError
    });

    if (params.autoOpen !== false) {
      requestExplanation();
    }

    return error;
  };

  return {
    explainError,
    lastError,
    getErrorExplanation
  };
}

export default ErrorExplainButton;
