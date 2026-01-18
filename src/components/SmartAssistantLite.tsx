/**
 * Smart Assistant Lite V2
 * Smart Coach floating assistant with drawer UI
 * Domain-locked to Kastana POS
 * Integrated with static knowledge base (assistant_knowledge.json)
 * Enhanced with AI intent understanding via Lovable AI
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  Bot, AlertCircle, AlertTriangle, Info, Lightbulb, ChevronRight, 
  HelpCircle, BookOpen, Send, User, X, Sparkles, GraduationCap, 
  MessageCircle, Target, Search, ArrowLeftRight, Maximize2, Minimize2,
  Loader2
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSmartAssistant, type SmartAssistantState } from "@/hooks/useSmartAssistant";
import { getSeverityColor, getSeverityIcon, type SmartRule, type RuleSeverity } from "@/lib/smartAssistantRules";
import { 
  getQuickReplies, 
  getAllTopics, 
  getEntryById, 
  searchKnowledge, 
  getFallbackResponse, 
  formatChatResponse,
  type KnowledgeEntry,
} from "@/lib/assistantKnowledge";
import {
  getUnseenChangelog,
  markChangelogSeen,
  type ChangelogEntry,
} from "@/lib/assistantChangelog";
import { useAuth } from "@/contexts/AuthContext";
import { useAssistantAI } from "@/hooks/useAssistantAI";

// Badge indicator component for tabs
interface TabBadgeProps {
  show: boolean;
  count?: number;
  variant?: "dot" | "count";
}

function TabBadge({ show, count, variant = "dot" }: TabBadgeProps) {
  if (!show) return null;
  
  if (variant === "count" && count !== undefined && count > 0) {
    return (
      <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded-full bg-muted-foreground/20 text-muted-foreground">
        {count > 9 ? "9+" : count}
      </span>
    );
  }
  
  // Subtle dot badge
  return (
    <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-muted-foreground/40" />
  );
}

// Knowledge topic categories for organized display
interface TopicCategory {
  id: string;
  title: { ar: string; en: string };
  icon: React.ReactNode;
  topicIds: string[];
}

const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    id: "pos_basics",
    title: { ar: "أساسيات POS", en: "POS Basics" },
    icon: <BookOpen className="h-4 w-4" />,
    topicIds: ["new_order_flow", "payment_flow", "hold_resume", "favorites_screen", "order_notes"]
  },
  {
    id: "shifts_cash",
    title: { ar: "الورديات والنقد", en: "Shifts & Cash" },
    icon: <BookOpen className="h-4 w-4" />,
    topicIds: ["open_shift", "close_shift", "z_report", "opening_cash", "closing_cash", "cash_in_out", "cash_drawer_reconciliation"]
  },
  {
    id: "orders_tables",
    title: { ar: "الطلبات والطاولات", en: "Orders & Tables" },
    icon: <BookOpen className="h-4 w-4" />,
    topicIds: ["move_table", "merge_orders", "split_order", "transfer_items_between_orders", "modifiers_addons"]
  },
  {
    id: "refunds_voids",
    title: { ar: "المرتجعات والإلغاء", en: "Refunds & Voids" },
    icon: <BookOpen className="h-4 w-4" />,
    topicIds: ["refund_overview", "void_vs_refund", "reopen_order"]
  },
  {
    id: "discounts",
    title: { ar: "الخصومات", en: "Discounts" },
    icon: <BookOpen className="h-4 w-4" />,
    topicIds: ["discount_application", "discount_settings"]
  },
  {
    id: "qr_orders",
    title: { ar: "طلبات QR", en: "QR Orders" },
    icon: <BookOpen className="h-4 w-4" />,
    topicIds: ["qr_menu_access", "qr_pending_orders", "qr_order_states"]
  },
  {
    id: "reports",
    title: { ar: "التقارير", en: "Reports" },
    icon: <BookOpen className="h-4 w-4" />,
    topicIds: ["sales_summary_report", "z_report_explain", "gross_vs_net", "refunds_report_explain", "payments_report_explain"]
  },
  {
    id: "troubleshooting",
    title: { ar: "حل المشاكل", en: "Troubleshooting" },
    icon: <AlertCircle className="h-4 w-4" />,
    topicIds: ["disabled_button_reasons", "payment_disabled", "pos_shift_required"]
  }
];

// Width mode types and configuration moved up after removing quick action pills

// Width mode types and configuration
type WidthMode = "compact" | "default" | "expanded";

// Content mode for browse readability
type ContentMode = "chat" | "browse";

const WIDTH_MODE_CONFIG: Record<WidthMode, { width: string; maxWidth: string }> = {
  compact: { width: "320px", maxWidth: "320px" },
  default: { width: "420px", maxWidth: "420px" },
  expanded: { width: "55vw", maxWidth: "700px" },
};

const STORAGE_KEY_WIDTH_MODE = "kastana_assistant_width_mode";
const STORAGE_KEY_VIEW_MODE = "kastana_assistant_view_mode";

// View mode types
type ViewMode = "panel" | "fullscreen";

// Get stored width mode from localStorage
function getStoredWidthMode(): WidthMode | null {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY_WIDTH_MODE);
    if (stored === "compact" || stored === "default" || stored === "expanded") {
      return stored;
    }
  }
  return null;
}

// Save width mode to localStorage
function saveWidthMode(mode: WidthMode): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_WIDTH_MODE, mode);
  }
}

// Get stored view mode from localStorage
function getStoredViewMode(): ViewMode {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
    if (stored === "panel" || stored === "fullscreen") {
      return stored;
    }
  }
  return "panel";
}

// Save view mode to localStorage
function saveViewMode(mode: ViewMode): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
  }
}

// Get default width mode based on role
function getDefaultWidthMode(role: string | null): WidthMode {
  if (role === "cashier" || role === "kitchen") {
    return "compact";
  }
  return "default";
}

// Cycle to next width mode
function getNextWidthMode(current: WidthMode): WidthMode {
  const modes: WidthMode[] = ["compact", "default", "expanded"];
  const currentIndex = modes.indexOf(current);
  return modes[(currentIndex + 1) % modes.length];
}

interface SmartAssistantLiteProps {
  // POS-specific context passed from parent
  activeTab?: string;
  orderItemCount?: number;
  orderStatus?: string | null;
  orderHeldAt?: Date | null;
  paymentMethod?: string | null;
  paymentAmount?: number;
  shiftOpenedAt?: Date | null;
  voidCountThisShift?: number;
  discountApplied?: boolean;
  discountReason?: string | null;
  selectedTableId?: string | null;
  tableHasActiveOrder?: boolean;
  lastAction?: string | null;
  refundAmountThisShift?: number;
  averageRefundAmount?: number;
  trainingMode?: boolean;
  // KDS-specific context
  kdsStuckOrderCount?: number;
  kdsRushOrderCount?: number;
  kdsIsFirstVisit?: boolean;
}

// Message type for visually distinct cards
type MessageType = "training" | "warning" | "info";

// Get message type from alert severity
function getMessageType(severity: RuleSeverity): MessageType {
  switch (severity) {
    case "error":
    case "warning":
      return "warning";
    case "info":
    default:
      return "info";
  }
}

// Message type styles and icons
function getMessageTypeStyles(type: MessageType) {
  switch (type) {
    case "training":
      return {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800/50",
        icon: <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
        title: { ar: "تدريب سريع", en: "Quick Training" },
      };
    case "warning":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-800/50",
        icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        title: { ar: "تنبيه", en: "Alert" },
      };
    case "info":
    default:
      return {
        bg: "bg-slate-50 dark:bg-slate-950/30",
        border: "border-slate-200 dark:border-slate-700/50",
        icon: <Lightbulb className="h-4 w-4 text-slate-600 dark:text-slate-400" />,
        title: { ar: "معلومة", en: "Info" },
      };
  }
}

// Severity icon component
function SeverityIcon({ severity, className }: { severity: RuleSeverity; className?: string }) {
  const iconName = getSeverityIcon(severity);
  const iconClass = cn("h-4 w-4", className);
  
  switch (iconName) {
    case "AlertCircle":
      return <AlertCircle className={iconClass} />;
    case "AlertTriangle":
      return <AlertTriangle className={iconClass} />;
    case "Info":
    default:
      return <Info className={iconClass} />;
  }
}

// Enhanced Alert card component with visual distinction
function AlertCard({ 
  alert, 
  language,
  compact = false
}: { 
  alert: SmartRule; 
  language: "ar" | "en";
  compact?: boolean;
}) {
  const messageType = getMessageType(alert.severity);
  const styles = getMessageTypeStyles(messageType);
  
  if (compact) {
    // Compact mode for KDS
    return (
      <div className={cn(
        "rounded-lg border p-3",
        styles.bg,
        styles.border
      )}>
        <div className="flex items-start gap-2">
          {styles.icon}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {alert.title[language]}
            </p>
            {alert.suggestion && (
              <p className="text-xs opacity-80 mt-1">
                {alert.suggestion[language]}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      styles.bg,
      styles.border
    )}>
      {/* Type Header */}
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-70">
        {styles.icon}
        <span>{styles.title[language]}</span>
      </div>
      
      {/* Content */}
      <div className="space-y-1">
        <h4 className="font-medium text-sm">
          {alert.title[language]}
        </h4>
        <p className="text-sm opacity-90">
          {alert.message[language]}
        </p>
      </div>
      
      {alert.suggestion && (
        <div className="flex items-start gap-2 pt-2 border-t border-current/10">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-60" />
          <p className="text-xs opacity-80">
            {alert.suggestion[language]}
          </p>
        </div>
      )}
    </div>
  );
}

// Storage key for guidance visibility
const STORAGE_KEY_HIDE_GUIDANCE = "assistant_hide_current_guidance";

// Get stored guidance visibility
function getStoredGuidanceHidden(): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY_HIDE_GUIDANCE) === "true";
  }
  return false;
}

// Save guidance visibility
function saveGuidanceHidden(hidden: boolean): void {
  if (typeof window !== "undefined") {
    if (hidden) {
      localStorage.setItem(STORAGE_KEY_HIDE_GUIDANCE, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY_HIDE_GUIDANCE);
    }
  }
}

// Context hint section with dismiss capability
function ContextSection({ 
  hint, 
  language,
  onDismiss
}: { 
  hint: SmartAssistantState["contextHint"]; 
  language: "ar" | "en";
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-lg bg-muted/50 border p-3 relative">
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      <div className="flex items-center gap-2 mb-2 pr-6">
        <ChevronRight className="h-4 w-4 text-primary" />
        <h4 className="font-medium text-sm text-foreground">
          {language === "ar" ? "ما تفعله الآن" : "What you're doing now"}
        </h4>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {hint.title[language]}
        </p>
        <p className="text-xs text-muted-foreground">
          {hint.description[language]}
        </p>
      </div>
    </div>
  );
}

// Re-show guidance button
function ShowGuidanceButton({
  language,
  onClick
}: {
  language: "ar" | "en";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg",
        "bg-muted/30 hover:bg-muted/50 border border-dashed border-muted-foreground/30",
        "text-muted-foreground hover:text-foreground text-xs",
        "transition-all duration-150"
      )}
    >
      <ChevronRight className="h-3 w-3" />
      <span>{language === "ar" ? "إظهار الإرشاد الحالي" : "Show current guidance"}</span>
    </button>
  );
}

// Knowledge topic card component with browse mode support
function KnowledgeTopicCard({ 
  entry, 
  language,
  onClose,
  isBrowseMode = false
}: { 
  entry: KnowledgeEntry; 
  language: "ar" | "en";
  onClose: () => void;
  isBrowseMode?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border bg-card space-y-2 transition-all duration-200",
      isBrowseMode ? "p-3" : "p-3"
    )}>
      {entry.title && (
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground text-sm">
            {entry.title[language]}
          </h4>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs"
            onClick={onClose}
          >
            {language === "ar" ? "رجوع" : "Back"}
          </Button>
        </div>
      )}
      <div className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">
        {entry.content[language]}
      </div>
    </div>
  );
}

// Quick tip component from knowledge base
function QuickTipCard({ tip }: { tip: string }) {
  return (
    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-3">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {tip}
        </p>
      </div>
    </div>
  );
}

// Feature announcement card (dismissible) - now uses ChangelogEntry
function FeatureAnnouncementCard({ 
  announcement, 
  language,
  onDismiss,
  onExplain
}: { 
  announcement: ChangelogEntry; 
  language: "ar" | "en";
  onDismiss: (id: string) => void;
  onExplain?: (knowledgeId: string) => void;
}) {
  return (
    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1 h-6 w-6 p-0 hover:bg-primary/10"
        onClick={() => onDismiss(announcement.id)}
      >
        <X className="h-3 w-3" />
      </Button>
      <div className="flex items-start gap-2 pr-6">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground">
            {announcement.title[language]}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {announcement.description[language]}
          </p>
          {announcement.knowledgeId && onExplain && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-primary mt-1"
              onClick={() => onExplain(announcement.knowledgeId!)}
            >
              {language === "ar" ? "اشرح المزيد" : "Explain more"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Chat message interface
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isThinking?: boolean;
}

// Chat bubble component
function ChatBubble({ 
  message, 
  language 
}: { 
  message: ChatMessage; 
  language: "ar" | "en";
}) {
  const isUser = message.role === "user";
  const isThinking = (message as ChatMessage & { isThinking?: boolean }).isThinking;
  
  return (
    <div className={cn(
      "flex gap-2 mb-3",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-secondary text-secondary-foreground"
      )}>
        {isUser ? <User className="h-4 w-4" /> : (
          isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />
        )}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-xl px-4 py-2.5",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-foreground",
        isThinking && "animate-pulse"
      )}>
        <p className={cn(
          "text-sm whitespace-pre-wrap leading-relaxed",
          isThinking && "text-muted-foreground italic"
        )}>
          {message.content}
        </p>
        {!isThinking && (
          <p className={cn(
            "text-[10px] mt-1.5 opacity-60",
            isUser ? "text-right" : "text-left"
          )}>
            {message.timestamp.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        )}
      </div>
    </div>
  );
}


// Full Training CTA Button
function FullTrainingCTA({ 
  language,
  onClick
}: {
  language: "ar" | "en";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-center gap-2 p-3 rounded-lg",
        "bg-primary/10 hover:bg-primary/15 border-2 border-primary/30 hover:border-primary/50",
        "text-primary font-medium text-sm",
        "transition-all duration-200 hover:shadow-md"
      )}
    >
      <Target className="h-4 w-4" />
      <span>{language === "ar" ? "ابدأ تدريب النظام" : "Start System Training"}</span>
    </button>
  );
}

export function SmartAssistantLite(props: SmartAssistantLiteProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("help");
  const [alertsViewed, setAlertsViewed] = useState(false);
  const [suggestionsViewed, setSuggestionsViewed] = useState(false);
  const [lastAlertCount, setLastAlertCount] = useState(0);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  // Feature announcements state (using assistantChangelog as single source)
  const [announcements, setAnnouncements] = useState<ChangelogEntry[]>([]);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Content mode state for browse readability
  const [contentMode, setContentMode] = useState<ContentMode>("chat");
  
  // AI-powered intent understanding
  const { processQuery, isLoading: isAIProcessing, error: aiError } = useAssistantAI();
  
  // Get user role for role-based changelog filtering
  const { role } = useAuth();
  
  // Width mode state with localStorage persistence
  const [widthMode, setWidthMode] = useState<WidthMode>(() => {
    const stored = getStoredWidthMode();
    return stored || getDefaultWidthMode(role);
  });
  
  // View mode state (panel vs fullscreen) with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Don't restore fullscreen on KDS
    if (role === "kitchen") return "panel";
    return getStoredViewMode();
  });
  
  // Track the width mode before entering fullscreen for training
  const [preTrainingWidthMode, setPreTrainingWidthMode] = useState<WidthMode | null>(null);
  const [wasInFullscreenBeforeTraining, setWasInFullscreenBeforeTraining] = useState(false);
  
  // Update width mode when role changes (if no stored preference)
  useEffect(() => {
    const stored = getStoredWidthMode();
    if (!stored && role) {
      setWidthMode(getDefaultWidthMode(role));
    }
    // Disable fullscreen on KDS
    if (role === "kitchen" && viewMode === "fullscreen") {
      setViewMode("panel");
      saveViewMode("panel");
    }
  }, [role, viewMode]);
  
  // ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewMode === "fullscreen" && open) {
        handleExitFullscreen();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, open]);
  
  // Handle width mode toggle
  const handleToggleWidth = useCallback(() => {
    setWidthMode((current) => {
      const next = getNextWidthMode(current);
      saveWidthMode(next);
      return next;
    });
  }, []);
  
  // Handle fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    setViewMode((current) => {
      const next: ViewMode = current === "fullscreen" ? "panel" : "fullscreen";
      saveViewMode(next);
      return next;
    });
  }, []);
  
  // Exit fullscreen helper
  const handleExitFullscreen = useCallback(() => {
    setViewMode("panel");
    saveViewMode("panel");
  }, []);
  
  // Auto-expand on full training (enters fullscreen mode)
  const handleExpandForTraining = useCallback(() => {
    // Save current state before entering training fullscreen
    setPreTrainingWidthMode(widthMode);
    setWasInFullscreenBeforeTraining(viewMode === "fullscreen");
    
    // Enter fullscreen for training
    setViewMode("fullscreen");
    saveViewMode("fullscreen");
  }, [widthMode, viewMode]);
  
  // Exit training fullscreen (restores previous state)
  const handleExitTrainingFullscreen = useCallback(() => {
    // Restore previous view mode
    if (!wasInFullscreenBeforeTraining) {
      setViewMode("panel");
      saveViewMode("panel");
    }
    // Restore previous width mode if we had one
    if (preTrainingWidthMode) {
      setWidthMode(preTrainingWidthMode);
      saveWidthMode(preTrainingWidthMode);
    }
    setPreTrainingWidthMode(null);
    setWasInFullscreenBeforeTraining(false);
  }, [preTrainingWidthMode, wasInFullscreenBeforeTraining]);
  
  const state = useSmartAssistant({
    activeTab: props.activeTab,
    orderItemCount: props.orderItemCount,
    orderStatus: props.orderStatus,
    orderHeldAt: props.orderHeldAt,
    paymentMethod: props.paymentMethod,
    paymentAmount: props.paymentAmount,
    shiftOpenedAt: props.shiftOpenedAt,
    voidCountThisShift: props.voidCountThisShift,
    discountApplied: props.discountApplied,
    discountReason: props.discountReason,
    selectedTableId: props.selectedTableId,
    tableHasActiveOrder: props.tableHasActiveOrder,
    lastAction: props.lastAction,
    refundAmountThisShift: props.refundAmountThisShift,
    averageRefundAmount: props.averageRefundAmount,
    trainingMode: props.trainingMode,
    // KDS metrics
    kdsStuckOrderCount: props.kdsStuckOrderCount,
    kdsRushOrderCount: props.kdsRushOrderCount,
    kdsIsFirstVisit: props.kdsIsFirstVisit,
  });

  const { language, contextHint, alerts, hasAlerts, screenContext } = state;
  
  // Check if in KDS mode (role = kitchen OR screen = kds)
  const isKDSMode = role === "kitchen" || screenContext === "kds";
  
  // Current guidance visibility state with localStorage persistence
  const [showCurrentGuidance, setShowCurrentGuidance] = useState<boolean>(() => {
    return !getStoredGuidanceHidden();
  });
  
  // Track previous screen/role for reset logic
  const prevScreenRef = useRef(screenContext);
  const prevRoleRef = useRef(role);
  
  // Reset guidance visibility when screen or role changes
  useEffect(() => {
    const screenChanged = prevScreenRef.current !== screenContext;
    const roleChanged = prevRoleRef.current !== role;
    
    if (screenChanged || roleChanged) {
      // Reset to show guidance on screen/role change
      setShowCurrentGuidance(true);
      saveGuidanceHidden(false);
      
      // Update refs
      prevScreenRef.current = screenContext;
      prevRoleRef.current = role;
    }
  }, [screenContext, role]);
  
  // Handle dismissing current guidance
  const handleDismissGuidance = useCallback(() => {
    setShowCurrentGuidance(false);
    saveGuidanceHidden(true);
  }, []);
  
  // Handle re-showing guidance
  const handleShowGuidance = useCallback(() => {
    setShowCurrentGuidance(true);
    saveGuidanceHidden(false);
  }, []);
  
  // Load feature announcements on mount (from assistantChangelog, filtered by role)
  useEffect(() => {
    if (role) {
      setAnnouncements(getUnseenChangelog(role));
    }
  }, [role]);
  
  // Handle dismissing an announcement
  const handleDismissAnnouncement = useCallback((id: string) => {
    markChangelogSeen(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }, []);
  
  // Handle explaining an announcement (navigate to knowledge entry)
  const handleExplainAnnouncement = useCallback((knowledgeId: string) => {
    setSelectedTopicId(knowledgeId);
    setActiveTab("help");
    setShowChat(false);
  }, []);
  
  // Get quick replies from knowledge base
  const quickRepliesFromKB = useMemo(() => getQuickReplies(language), [language]);
  
  // Get all available topics organized by category
  const allTopics = useMemo(() => getAllTopics(language), [language]);
  
  // Get selected topic entry
  const selectedEntry = useMemo(() => 
    selectedTopicId ? getEntryById(selectedTopicId) : null
  , [selectedTopicId]);
  
  // Combined count for alerts badge (alerts + announcements)
  const totalAlertCount = alerts.length + announcements.length;
  const hasAnyAlerts = hasAlerts || announcements.length > 0;
  
  // Track when alerts change to show badge
  useEffect(() => {
    if (alerts.length !== lastAlertCount) {
      // New alerts appeared, mark as unviewed
      if (alerts.length > lastAlertCount) {
        setAlertsViewed(false);
      }
      setLastAlertCount(alerts.length);
    }
  }, [alerts.length, lastAlertCount]);

  // Mark alerts as viewed when tab is opened
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    if (value === "alerts") {
      setAlertsViewed(true);
    } else if (value === "suggestions") {
      setSuggestionsViewed(true);
    }
  }, []);

  // Reset viewed state when drawer closes and new content appears
  useEffect(() => {
    if (!open) {
      // Mark alerts as viewed if there are no alerts
      if (!hasAlerts) {
        setAlertsViewed(true);
      }
    }
  }, [open, hasAlerts]);

  // Auto-scroll chat to bottom when new messages appear
  useEffect(() => {
    if (chatScrollRef.current && chatMessages.length > 0) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle sending a chat message with AI intent understanding
  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText || chatInput).trim();
    if (!text || isAIProcessing) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");

    // Add a placeholder "thinking" message
    const thinkingId = `thinking-${Date.now()}`;
    setChatMessages(prev => [...prev, {
      id: thinkingId,
      role: "assistant",
      content: language === "ar" ? "جاري التفكير..." : "Thinking...",
      timestamp: new Date(),
      isThinking: true
    } as ChatMessage]);

    try {
      // Use AI to understand intent and get response from Knowledge Base
      const responseContent = await processQuery(text, language);
      
      // Replace thinking message with actual response
      setChatMessages(prev => prev.map(msg => 
        msg.id === thinkingId 
          ? {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: responseContent,
              timestamp: new Date()
            }
          : msg
      ));
    } catch (error) {
      console.error("Assistant error:", error);
      // Replace thinking with fallback
      setChatMessages(prev => prev.map(msg => 
        msg.id === thinkingId 
          ? {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: getFallbackResponse(language),
              timestamp: new Date()
            }
          : msg
      ));
    }
  }, [chatInput, language, isAIProcessing, processQuery]);

  // Handle quick question click (from suggestions tab or chat)
  const handleQuickQuestion = useCallback((question: string) => {
    setActiveTab("help");
    setShowChat(true);
    setSelectedTopicId(null);
    // Small delay to ensure tab switches first
    setTimeout(() => {
      handleSendMessage(question);
    }, 100);
  }, [handleSendMessage]);

  // Handle full training CTA - auto-expands width
  const handleStartFullTraining = useCallback(() => {
    // Auto-expand for full training
    handleExpandForTraining();
    const trainingQuery = language === "ar" 
      ? "ابدأ تدريب النظام الكامل" 
      : "Start full system training";
    handleQuickQuestion(trainingQuery);
  }, [language, handleQuickQuestion, handleExpandForTraining]);


  // Don't render if not visible on current route
  if (!state.isVisible) {
    return null;
  }

  const isRTL = language === "ar";
  
  // Dynamic branding based on language
  const assistantTitle = isRTL ? "مساعد كاستنا الذكي" : "Kastana Smart Coach";
  const assistantSubtitle = isRTL ? "مدربك أثناء العمل" : "Your coach while working";
  
  // Width configuration based on current mode (or fullscreen)
  const isFullscreen = viewMode === "fullscreen" && !isKDSMode;
  const widthConfig = WIDTH_MODE_CONFIG[widthMode];
  const widthModeLabel = {
    compact: { ar: "مضغوط", en: "Compact" },
    default: { ar: "عادي", en: "Default" },
    expanded: { ar: "موسّع", en: "Expanded" },
  };
  
  // Fullscreen style overrides
  const sheetStyle = isFullscreen
    ? {
        width: "100vw",
        maxWidth: "100vw",
        minWidth: "100vw",
      }
    : {
        width: widthConfig.width,
        maxWidth: widthConfig.maxWidth,
        minWidth: "280px",
      };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className={cn(
            "fixed bottom-6 z-50 h-14 w-14 rounded-full shadow-lg",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "transition-all duration-200 hover:scale-105",
            isRTL ? "right-6" : "left-6"
          )}
        >
          <Bot className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent
        side={isRTL ? "right" : "left"}
        className={cn(
          "flex flex-col p-0 transition-all duration-300 ease-in-out",
          isFullscreen && "!w-screen !max-w-none"
        )}
        style={sheetStyle}
      >
        {/* Compact Header with Width Toggle */}
        <SheetHeader className="px-4 py-2.5 border-b bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-foreground text-sm font-semibold leading-tight">
                {assistantTitle}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Width Toggle Button - only show in panel mode */}
              {!isKDSMode && !isFullscreen && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={handleToggleWidth}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">
                        {language === "ar" ? "تغيير عرض المساعد" : "Change assistant width"}
                        <span className="opacity-60 ml-1">
                          ({widthModeLabel[widthMode][language]})
                        </span>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Fullscreen Toggle Button - disabled on KDS */}
              {!isKDSMode && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0 text-muted-foreground hover:text-foreground",
                          isFullscreen && "bg-primary/10 text-primary"
                        )}
                        onClick={handleToggleFullscreen}
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">
                        {isFullscreen 
                          ? (language === "ar" ? "إنهاء العرض الكامل (ESC)" : "Exit full screen (ESC)")
                          : (language === "ar" ? "عرض كامل للمساعد" : "Full screen view")
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
            </div>
          </div>
        </SheetHeader>

        {/* KDS Mode: Compact alert-only view */}
        {isKDSMode ? (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {/* Alerts Only - Compact */}
              {hasAlerts ? (
                <div className="space-y-2">
                  {alerts.map((alert, index) => (
                    <AlertCard 
                      key={`${alert.id}-${index}`} 
                      alert={alert} 
                      language={language}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
                    <Info className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" 
                      ? "لا توجد تنبيهات. المطبخ يعمل بسلاسة."
                      : "No alerts. Kitchen running smoothly."
                    }
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <>

            {/* Help Content - Direct without tabs */}
            <div className="flex-1 flex flex-col min-h-0">
                  {/* Compact Navigation Bar - Chat and Browse tabs */}
                  <div className="border-b px-2 py-1.5">
                    <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
                      <button
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-xs font-medium transition-all duration-150",
                          showChat 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => {
                          setShowChat(true);
                          setContentMode("chat");
                        }}
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>{language === "ar" ? "المحادثة" : "Chat"}</span>
                      </button>
                      <button
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-xs font-medium transition-all duration-150",
                          !showChat 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => {
                          setShowChat(false);
                          setContentMode("browse");
                        }}
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>{language === "ar" ? "المواضيع" : "Topics"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Content Area - Switches between Chat and Browse */}
                  {showChat ? (
                    <>
                      {/* Chat Messages Area */}
                      <div 
                        ref={chatScrollRef}
                        className="flex-1 overflow-y-auto p-4"
                      >
                        {chatMessages.length === 0 ? (
                          <div className="text-center py-6">
                            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                              <MessageCircle className="h-7 w-7 text-primary" />
                            </div>
                            <p className="text-base font-medium mb-1">
                              {language === "ar" ? "مرحباً! كيف أساعدك؟" : "Hello! How can I help?"}
                            </p>
                            <p className="text-sm text-muted-foreground mb-5">
                              {language === "ar" 
                                ? "اسألني عن أي شيء يخص نظام Kastana POS"
                                : "Ask me anything about Kastana POS system"
                              }
                            </p>
                          </div>
                        ) : (
                          <>
                            {chatMessages.map((message) => (
                              <ChatBubble 
                                key={message.id} 
                                message={message} 
                                language={language} 
                              />
                            ))}
                          </>
                        )}
                      </div>


                      {/* Enhanced Chat Input */}
                      <div className="p-3 border-t bg-background shrink-0">
                        <form 
                          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                          className="flex gap-2"
                        >
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder={language === "ar" ? "اكتب سؤالك هنا..." : "Type your question here..."}
                              className="flex-1 h-11 text-sm pl-9 pr-3"
                            />
                          </div>
                          <Button 
                            type="submit" 
                            size="sm" 
                            className="h-11 w-11 p-0"
                            disabled={!chatInput.trim()}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </>
                  ) : (
                    /* Browse Topics Content */
                    <ScrollArea className="flex-1">
                      <div className="p-3 space-y-2">
                        {/* Show selected topic if any */}
                        {selectedEntry ? (
                          <KnowledgeTopicCard 
                            entry={selectedEntry} 
                            language={language}
                            onClose={() => setSelectedTopicId(null)}
                            isBrowseMode={contentMode === "browse"}
                          />
                        ) : (
                          <>
                            {/* Topic Categories */}
                            <div className="space-y-2">
                              {TOPIC_CATEGORIES.map((category) => (
                                <div key={category.id} className="rounded-lg border overflow-hidden">
                                  <button
                                    className="w-full flex items-center justify-between hover:bg-muted/50 transition-colors p-2.5 text-left"
                                    onClick={() => setExpandedCategory(
                                      expandedCategory === category.id ? null : category.id
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{category.icon}</span>
                                      <span className="font-medium text-sm">
                                        {category.title[language]}
                                      </span>
                                    </div>
                                    <ChevronRight className={cn(
                                      "h-4 w-4 text-muted-foreground transition-transform",
                                      expandedCategory === category.id && "rotate-90"
                                    )} />
                                  </button>
                                  
                                  {expandedCategory === category.id && (
                                    <div className="border-t bg-muted/30 p-2 space-y-1">
                                      {category.topicIds.map((topicId) => {
                                        const topic = allTopics.find(t => t.id === topicId);
                                        if (!topic) return null;
                                        return (
                                          <button
                                            key={topicId}
                                            className="w-full text-left rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-xs px-2 py-1.5"
                                            onClick={() => setSelectedTopicId(topicId)}
                                          >
                                            {topic.title}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Alert Types Legend */}
                            <div className="rounded-lg border mt-2 p-3">
                              <h4 className="font-medium text-sm mb-2">
                                {language === "ar" ? "أنواع التنبيهات" : "Alert Types"}
                              </h4>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
                                  <span className="text-muted-foreground">
                                    {language === "ar" ? "تدريب - تعلّم ميزة جديدة" : "Training - Learn a new feature"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                  <span className="text-muted-foreground">
                                    {language === "ar" ? "تنبيه - ينبغي مراجعته" : "Alert - Should be reviewed"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Lightbulb className="h-3.5 w-3.5 text-slate-500" />
                                  <span className="text-muted-foreground">
                                    {language === "ar" ? "معلومة - للعلم فقط" : "Info - For your awareness"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  )}
            </div>
          </>
        )}
        
        {/* Compact Footer */}
        <div className="px-3 py-1.5 border-t bg-muted/30">
          <p className="text-[10px] text-center text-muted-foreground">
            {assistantTitle}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
