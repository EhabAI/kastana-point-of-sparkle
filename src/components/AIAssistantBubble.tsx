import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, Lightbulb } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
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

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  intent?: AssistantIntent;
  isSuggestion?: boolean;
}

export function AIAssistantBubble() {
  const { isRTL, language } = useLanguage();
  const systemLang = language as "ar" | "en";
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [open, setOpen] = useState(false);
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
    
    let responseContent: string;
    let responseIntent: AssistantIntent = scopeCheck.intent;
    let isSuggestion = false;

    if (!scopeCheck.isInScope) {
      // Out of scope - return polite rejection
      responseContent = getOutOfScopeMessage(systemLang);
      responseIntent = "out_of_scope";
    } else if (scopeCheck.intent === "greeting") {
      // Greeting response
      responseContent = getGreetingMessage(systemLang);
    } else {
      // Check if user is asking for a smart suggestion
      const suggestionType = detectSuggestionType(userMessage);
      
      if (suggestionType) {
        // Smart suggestion flow
        isSuggestion = true;
        // For now, assume we don't have data context (would need integration with actual screen data)
        // This marks the suggestion as needing data, which we explain clearly
        const hasDataContext = checkForDataContext(userMessage, suggestionType);
        responseContent = formatSuggestion(suggestionType, systemLang, hasDataContext);
      } else {
        // Regular knowledge base search
        const knowledgeEntry = searchKnowledge(userMessage, systemLang, scopeCheck.intent);
        
        if (knowledgeEntry) {
          responseContent = getKnowledgeContent(knowledgeEntry, systemLang);
        } else {
          // No match found - return fallback
          responseContent = getFallbackResponse(systemLang);
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
    };
    
    setMessages((prev) => [...prev, assistantResponse]);
    setIsProcessing(false);
  };

  /**
   * Check if user message contains data context hints
   * In a real implementation, this would check actual screen data
   */
  const checkForDataContext = (message: string, _type: SuggestionType): boolean => {
    // Look for number patterns or comparative language that suggests user is looking at data
    const dataPatterns = [
      /\d+/,                          // Contains numbers
      /أقل|أكثر|زيادة|نقص/,            // Arabic comparison words
      /less|more|lower|higher|down|up/, // English comparison words
      /\%/,                            // Percentage sign
      /ريال|دينار|jod|sar/i,          // Currency mentions
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
          <SheetTitle className="text-primary-foreground flex items-center gap-2">
            <Bot className="h-5 w-5" />
            مساعد Kastana الذكي
          </SheetTitle>
        </SheetHeader>

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
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
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
      </SheetContent>
    </Sheet>
  );
}
