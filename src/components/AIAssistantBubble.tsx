import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Bot, Lightbulb, GraduationCap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  checkScope,
  getOutOfScopeMessage,
  getGreetingMessage,
  type AssistantIntent,
} from "@/lib/assistantScopeGuard";
import {
  searchKnowledge,
  getKnowledgeContent,
  getFallbackResponse,
  getQuickReplies,
} from "@/lib/assistantKnowledge";
import {
  detectSuggestionType,
  formatSuggestion,
  type SuggestionType,
} from "@/lib/assistantSuggestions";
import {
  detectAlertType,
  generateAlert,
  type SmartAlert,
} from "@/lib/assistantAlerts";
import {
  findRelevantCard,
  getCardById,
  type TrainingCard,
} from "@/lib/assistantTrainingCards";
import {
  checkScreenVisitTrigger,
  checkSystemUpdateTrigger,
  recordErrorAndCheckTrigger,
  markCardTriggered,
} from "@/lib/assistantTriggers";
import {
  isInventoryRelatedQuery,
  getInventoryDisabledMessage,
} from "@/lib/assistantInventoryGuard";
import { AIAssistantAlert } from "@/components/AIAssistantAlert";
import { AIAssistantTrainingCard } from "@/components/AIAssistantTrainingCard";
import { AIAssistantTrainingList } from "@/components/AIAssistantTrainingList";
import { useRestaurantInventoryStatus } from "@/hooks/useInventoryModuleToggle";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useCashierRestaurant } from "@/hooks/pos/useCashierRestaurant";

type ViewMode = "chat" | "training";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  intent?: AssistantIntent;
  isSuggestion?: boolean;
  alert?: SmartAlert;
  trainingCard?: TrainingCard;
}

export function AIAssistantBubble() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isRTL, language } = useLanguage();
  const { role } = useAuth();
  const systemLang = language as "ar" | "en";
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get restaurant ID based on role
  const { data: ownerRestaurant } = useOwnerRestaurant();
  const { data: cashierRestaurant } = useCashierRestaurant();
  const restaurantId = role === "owner" ? ownerRestaurant?.id : role === "cashier" ? cashierRestaurant?.id : undefined;
  
  // Check inventory enabled status (only for owner/cashier, not system_admin)
  const { data: inventoryEnabled } = useRestaurantInventoryStatus(
    role !== "system_admin" ? restaurantId : undefined
  );
  
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: getGreetingMessage(systemLang),
      role: "assistant",
      timestamp: new Date(),
      intent: "greeting",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<string[]>([]);
  const [pendingTriggerCard, setPendingTriggerCard] = useState<TrainingCard | null>(null);

  // Check for screen visit triggers
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    const cardId = checkScreenVisitTrigger(currentPath);
    
    if (cardId) {
      const card = getCardById(cardId);
      if (card) {
        markCardTriggered("screen_visit", cardId);
        setPendingTriggerCard(card);
        setOpen(true); // Open assistant to show the card
      }
    }
  }, [location.pathname, location.search]);

  // Check for system update triggers on mount
  useEffect(() => {
    const updateCardIds = checkSystemUpdateTrigger();
    
    if (updateCardIds.length > 0) {
      const firstCard = getCardById(updateCardIds[0]);
      if (firstCard) {
        markCardTriggered("system_update", updateCardIds[0]);
        setPendingTriggerCard(firstCard);
        setOpen(true);
      }
    }
  }, []);

  // Handle pending trigger card
  useEffect(() => {
    if (pendingTriggerCard && open) {
      const triggerMessage: Message = {
        id: `trigger_${Date.now()}`,
        content: systemLang === "ar" 
          ? "🎓 نصيحة سريعة لمساعدتك:"
          : "🎓 Quick tip to help you:",
        role: "assistant",
        timestamp: new Date(),
        trainingCard: pendingTriggerCard,
      };
      setMessages((prev) => [...prev, triggerMessage]);
      setPendingTriggerCard(null);
    }
  }, [pendingTriggerCard, open, systemLang]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Get quick replies
  const quickReplies = getQuickReplies(systemLang);

  const handleSendMessage = async (messageText?: string) => {
    const userMessage = (messageText || inputValue).trim();
    if (!userMessage || isProcessing) return;

    setInputValue("");
    setIsProcessing(true);

    // Add user message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: userMessage,
      role: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Check scope
    const scopeCheck = checkScope(userMessage);
    
    let responseContent: string = "";
    let responseIntent: AssistantIntent = scopeCheck.intent;
    let isSuggestion = false;
    let alertData: SmartAlert | undefined;
    let trainingCardData: TrainingCard | undefined;

    if (!scopeCheck.isInScope) {
      // Out of scope - return polite rejection
      responseContent = getOutOfScopeMessage(systemLang);
      responseIntent = "out_of_scope";
    } else if (scopeCheck.intent === "greeting") {
      // Greeting response
      responseContent = getGreetingMessage(systemLang);
    } else if (
      // Check if user is asking about inventory when it's disabled (for owner/cashier only)
      role !== "system_admin" && 
      !inventoryEnabled && 
      isInventoryRelatedQuery(userMessage)
    ) {
      // Inventory module is disabled - return friendly message
      responseContent = getInventoryDisabledMessage(systemLang);
      responseIntent = "why_disabled";
    } else {
      // Check if user is asking about an alert topic (e.g., "why are sales low?")
      const alertType = detectAlertType(userMessage);
      
      if (alertType) {
        // Generate smart alert with explanation and report button
        alertData = generateAlert(alertType);
        responseContent = ""; // Content will be rendered by AIAssistantAlert component
      } else {
        // Check if user is asking for a smart suggestion
        const suggestionType = detectSuggestionType(userMessage);
        
        if (suggestionType) {
          // Smart suggestion flow
          isSuggestion = true;
          const hasDataContext = checkForDataContext(userMessage, suggestionType);
          responseContent = formatSuggestion(suggestionType, systemLang, hasDataContext);
        } else {
          // Regular knowledge base search
          const knowledgeEntry = searchKnowledge(userMessage, systemLang, scopeCheck.intent);
          
          if (knowledgeEntry) {
            responseContent = getKnowledgeContent(knowledgeEntry, systemLang);
            
            // Check for relevant training card (show alongside knowledge response)
            const relevantCard = findRelevantCard(userMessage);
            if (relevantCard && !dismissedCards.includes(relevantCard.id)) {
              trainingCardData = relevantCard;
            }
          } else {
            // No match found - return fallback
            responseContent = getFallbackResponse(systemLang);
          }
        }
      }
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    const assistantResponse: Message = {
      id: (Date.now() + 1).toString(),
      content: responseContent,
      role: "assistant",
      timestamp: new Date(),
      intent: responseIntent,
      isSuggestion,
      alert: alertData,
      trainingCard: trainingCardData,
    };
    
    setMessages((prev) => [...prev, assistantResponse]);
    setIsProcessing(false);
  };

  /**
   * Handle dismissing a training card
   */
  const handleDismissCard = (cardId: string) => {
    setDismissedCards((prev) => [...prev, cardId]);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.trainingCard?.id === cardId
          ? { ...msg, trainingCard: undefined }
          : msg
      )
    );
  };

  /**
   * Handle opening a report from an alert
   */
  const handleOpenReport = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  /**
   * Handle selecting a card from training list
   */
  const handleSelectTrainingCard = (card: TrainingCard) => {
    const newMessage: Message = {
      id: `selected_${Date.now()}`,
      content: systemLang === "ar" 
        ? `📖 ${card.title.ar}`
        : `📖 ${card.title.en}`,
      role: "assistant",
      timestamp: new Date(),
      trainingCard: card,
    };
    setMessages((prev) => [...prev, newMessage]);
    setViewMode("chat");
  };

  /**
   * Record user error for trigger tracking
   * Call this from parent components when errors occur
   */
  const triggerErrorCard = (errorAction: string): void => {
    const cardId = recordErrorAndCheckTrigger(errorAction);
    if (cardId) {
      const card = getCardById(cardId);
      if (card) {
        markCardTriggered("repeated_error", cardId);
        setPendingTriggerCard(card);
        setOpen(true);
      }
    }
  };

  // Expose error trigger function globally (for other components to use)
  useEffect(() => {
    (window as unknown as { triggerAssistantError?: typeof triggerErrorCard }).triggerAssistantError = triggerErrorCard;
    return () => {
      delete (window as unknown as { triggerAssistantError?: typeof triggerErrorCard }).triggerAssistantError;
    };
  }, []);

  /**
   * Check if user message contains data context hints
   */
  const checkForDataContext = (message: string, _type: SuggestionType): boolean => {
    const dataPatterns = [
      /\d+/,
      /أقل|أكثر|زيادة|نقص/,
      /less|more|lower|higher|down|up/,
      /\%/,
      /ريال|دينار|jod|sar/i,
    ];
    return dataPatterns.some((pattern) => pattern.test(message));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
          {open ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isRTL ? "right" : "left"}
        className="w-full sm:w-[400px] flex flex-col p-0"
      >
        <SheetHeader className="p-4 border-b bg-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-primary-foreground flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {systemLang === "ar" ? "مساعد Kastana الذكي" : "Kastana AI Assistant"}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setViewMode(viewMode === "chat" ? "training" : "chat")}
            >
              <GraduationCap className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Training List View */}
        {viewMode === "training" ? (
          <AIAssistantTrainingList
            language={systemLang}
            onSelectCard={handleSelectTrainingCard}
            onClose={() => setViewMode("chat")}
          />
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Alert message */}
                    {message.alert ? (
                      <div className="max-w-[90%]">
                        <AIAssistantAlert
                          alert={message.alert}
                          language={systemLang}
                          onOpenReport={handleOpenReport}
                        />
                      </div>
                    ) : (
                      <div className="max-w-[85%] space-y-2">
                        {/* Regular message content */}
                        {message.content && (
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                              message.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : message.isSuggestion
                                ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-foreground rounded-bl-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            )}
                          >
                            {message.isSuggestion && (
                              <Lightbulb className="inline-block h-4 w-4 text-amber-500 mr-1 mb-0.5" />
                            )}
                            {message.content}
                          </div>
                        )}
                        
                        {/* Training Card (if relevant and not dismissed) */}
                        {message.trainingCard && (
                          <AIAssistantTrainingCard
                            card={message.trainingCard}
                            language={systemLang}
                            onDismiss={handleDismissCard}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Replies */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {quickReplies.slice(0, 3).map((reply, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSendMessage(reply)}
                      disabled={isProcessing}
                    >
                      {reply}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRTL ? "اكتب سؤالك هنا..." : "Type your question..."}
                  className="flex-1"
                  disabled={isProcessing}
                />
                <Button
                  size="icon"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isProcessing}
                >
                  <Send className={cn("h-4 w-4", isRTL && "rotate-180")} />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Export function for external components to trigger error cards
export function triggerAssistantError(errorAction: string): void {
  const fn = (window as unknown as { triggerAssistantError?: (action: string) => void }).triggerAssistantError;
  if (fn) {
    fn(errorAction);
  }
}
