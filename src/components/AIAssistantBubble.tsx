import { useState } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
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
  getIntentContext,
  type AssistantIntent,
} from "@/lib/assistantScopeGuard";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  intent?: AssistantIntent;
}

export function AIAssistantBubble() {
  const { isRTL, language } = useLanguage();
  const systemLang = language as "ar" | "en";
  
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage = inputValue.trim();
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

    if (!scopeCheck.isInScope) {
      // Out of scope - return polite rejection
      responseContent = getOutOfScopeMessage(systemLang);
      responseIntent = "out_of_scope";
    } else if (scopeCheck.intent === "greeting") {
      // Greeting response
      responseContent = getGreetingMessage(systemLang);
    } else {
      // In-scope query - provide guidance based on intent
      const intentContext = getIntentContext(scopeCheck.intent);
      responseContent = generateScopedResponse(userMessage, scopeCheck.intent, systemLang, intentContext);
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const assistantResponse: Message = {
      id: (Date.now() + 1).toString(),
      content: responseContent,
      role: "assistant",
      timestamp: new Date(),
      intent: responseIntent,
    };
    
    setMessages((prev) => [...prev, assistantResponse]);
    setIsProcessing(false);
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
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
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
              onClick={handleSendMessage}
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

/**
 * Generate a scoped response based on intent (placeholder - will connect to AI later)
 */
function generateScopedResponse(
  message: string,
  intent: AssistantIntent,
  language: "ar" | "en",
  _intentContext: string
): string {
  // Placeholder responses based on intent
  // This will be replaced with actual AI integration
  
  const responses = {
    how_to: {
      ar: "أفهم أنك تريد معرفة كيفية تنفيذ مهمة معينة. هذه نسخة تجريبية من المساعد الذكي.\n\nللحصول على إرشادات مفصلة، يرجى التواصل مع فريق الدعم أو مراجعة دليل المستخدم.",
      en: "I understand you want to know how to perform a specific task. This is a demo version of the AI assistant.\n\nFor detailed guidance, please contact support or refer to the user guide.",
    },
    why_disabled: {
      ar: "أفهم أن هناك ميزة معطلة. الأسباب الشائعة تشمل:\n\n• عدم فتح وردية\n• صلاحيات غير كافية\n• بيانات مفقودة\n• المطعم غير نشط\n\nهل يمكنك إخباري بالميزة المحددة؟",
      en: "I understand a feature is disabled. Common reasons include:\n\n• Shift not opened\n• Insufficient permissions\n• Missing data\n• Restaurant inactive\n\nCan you tell me which specific feature?",
    },
    explain_report: {
      ar: "أفهم أنك تريد شرح تقرير معين. هذه نسخة تجريبية.\n\nالتقارير المتاحة تشمل:\n• تقارير المبيعات\n• تقارير الأرباح والتكاليف\n• تقارير المخزون\n• تقارير الموظفين",
      en: "I understand you want a report explained. This is a demo version.\n\nAvailable reports include:\n• Sales reports\n• Profit & cost reports\n• Inventory reports\n• Staff reports",
    },
    troubleshooting: {
      ar: "أفهم أنك تواجه مشكلة. للمساعدة بشكل أفضل، يرجى وصف:\n\n1. ماذا كنت تحاول فعله؟\n2. ما هي رسالة الخطأ (إن وجدت)؟\n3. متى بدأت المشكلة؟",
      en: "I understand you're facing an issue. To help better, please describe:\n\n1. What were you trying to do?\n2. What error message appeared (if any)?\n3. When did the problem start?",
    },
  };

  return responses[intent]?.[language] || responses.how_to[language];
}
