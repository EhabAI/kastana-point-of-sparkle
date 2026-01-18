import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  KnowledgeEntry, 
  getEntryById, 
  getFallbackResponse,
  getAllTopics
} from "@/lib/assistantKnowledge";

interface IntentResult {
  intent: "report" | "training" | "explanation" | "example" | "follow_up" | "system_overview" | "section_help" | "troubleshoot" | "unknown";
  matchedEntryIds: string[];
  depth: "brief" | "detailed";
  reasoning: string;
  troubleshootFlow?: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseAssistantAIReturn {
  processQuery: (query: string, language: "ar" | "en") => Promise<string>;
  isLoading: boolean;
  lastIntent: IntentResult | null;
  error: string | null;
}

/**
 * Hook to integrate AI intent understanding with the Knowledge Base
 * Uses OpenAI via Lovable AI to understand user intent, 
 * then retrieves responses strictly from the Knowledge Base
 */
export function useAssistantAI(): UseAssistantAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastIntent, setLastIntent] = useState<IntentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of last matched entry for follow-up questions
  const lastMatchedEntryRef = useRef<string | null>(null);
  
  // Keep recent conversation for context
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);

  const processQuery = useCallback(async (
    query: string, 
    language: "ar" | "en"
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all knowledge entry summaries for the AI
      const topics = getAllTopics(language);
      const knowledgeEntries = topics.map(t => {
        const entry = getEntryById(t.id);
        return {
          id: t.id,
          title: t.title,
          keywords: entry ? [...entry.keywords.ar, ...entry.keywords.en] : [],
        };
      });

      // Call the edge function
      const { data, error: fnError } = await supabase.functions.invoke("assistant-intent", {
        body: {
          userQuery: query,
          language,
          knowledgeEntries,
          conversationHistory: conversationHistoryRef.current.slice(-4), // Last 2 exchanges
        },
      });

      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error(fnError.message || "AI service error");
      }

      // Handle rate limit or payment errors
      if (data?.error) {
        setError(data.error);
        // Fall back to basic search
        return getFallbackResponse(language);
      }

      const intentResult: IntentResult = data;
      setLastIntent(intentResult);

      // Handle follow-up questions
      if (intentResult.intent === "follow_up" && lastMatchedEntryRef.current) {
        // Use the last matched entry for detailed response
        intentResult.matchedEntryIds = [lastMatchedEntryRef.current];
        intentResult.depth = "detailed";
      }

      // Generate response from Knowledge Base
      const response = generateResponseFromKnowledge(
        intentResult,
        language
      );

      // Update conversation history
      conversationHistoryRef.current.push({ role: "user", content: query });
      conversationHistoryRef.current.push({ role: "assistant", content: response });
      
      // Keep only last 6 messages
      if (conversationHistoryRef.current.length > 6) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-6);
      }

      // Remember last matched entry for follow-ups
      if (intentResult.matchedEntryIds.length > 0) {
        lastMatchedEntryRef.current = intentResult.matchedEntryIds[0];
      }

      return response;

    } catch (err) {
      console.error("Assistant AI error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Return fallback on error
      return getFallbackResponse(language);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { processQuery, isLoading, lastIntent, error };
}

/**
 * Built-in system overview responses (not from knowledge base)
 */
const SYSTEM_OVERVIEW_RESPONSES = {
  brief: {
    ar: `نظام Kastana POS هو نظام نقاط بيع متكامل للمطاعم والمقاهي.

✨ المميزات الرئيسية:
• إدارة الطلبات (سفري/صالة)
• الدفع بطرق متعددة (نقد/بطاقة)
• إدارة الورديات وتقارير Z
• المرتجعات والإلغاءات
• إدارة الطاولات والدمج
• تتبع المخزون

💡 اكتب "اشرح أكثر" لمعرفة المزيد عن أي ميزة.`,
    en: `Kastana POS is a complete point-of-sale system for restaurants and cafes.

✨ Key Features:
• Order management (Takeaway/Dine-in)
• Multiple payment methods (Cash/Card)
• Shift management and Z Reports
• Refunds and voids
• Table management and merging
• Inventory tracking

💡 Type "explain more" to learn about any feature.`
  },
  detailed: {
    ar: `نظام Kastana POS - نظرة شاملة

🛒 إدارة الطلبات:
• إنشاء طلبات سفري أو صالة
• إضافة أصناف من القائمة مع تعديلات
• تعليق واستئناف الطلبات
• دمج طلبات الطاولات
• نقل أصناف بين الطلبات

💳 الدفع والمالية:
• دفع نقدي أو بالبطاقة
• تطبيق خصومات
• إدارة المرتجعات
• تقارير Z اليومية

👥 إدارة الورديات:
• فتح وإغلاق الورديات
• إيداع وسحب النقد
• مطابقة الصندوق

📊 التقارير:
• تقرير المبيعات
• تقرير المرتجعات
• أداء الموظفين

📦 المخزون:
• تتبع المواد الخام
• إنشاء الوصفات
• تنبيهات النقص`,
    en: `Kastana POS - Complete Overview

🛒 Order Management:
• Create takeaway or dine-in orders
• Add menu items with modifiers
• Hold and resume orders
• Merge table orders
• Transfer items between orders

💳 Payments & Finance:
• Cash or card payments
• Apply discounts
• Process refunds
• Daily Z Reports

👥 Shift Management:
• Open and close shifts
• Cash in/out
• Drawer reconciliation

📊 Reports:
• Sales reports
• Refunds report
• Staff performance

📦 Inventory:
• Track raw materials
• Create recipes
• Low stock alerts`
  }
};

/**
 * Troubleshooting responses for common flows
 */
const TROUBLESHOOT_RESPONSES: Record<string, { ar: string; en: string }> = {
  payment: {
    ar: `أفهم أن لديك مشكلة في الدفع أو إغلاق الفاتورة. لا تقلق، هذه مشاكل شائعة ولها حلول! 💡

🔍 الأسباب الأكثر شيوعاً:

1️⃣ **الطلب معلق (ON_HOLD)**
   → يجب استئناف الطلب أولاً من قائمة الطلبات المعلقة

2️⃣ **الطلب فارغ**
   → لا يمكن الدفع لطلب بدون أصناف

3️⃣ **طريقة الدفع معطلة**
   → تأكد أن طريقة الدفع المطلوبة مفعلة في الإعدادات

4️⃣ **الوردية مغلقة**
   → يجب فتح وردية أولاً للقيام بأي عملية دفع

❓ هل المشكلة تحدث قبل محاولة الدفع أم بعد اختيار طريقة الدفع؟`,
    en: `I understand you're having a payment or invoice issue. Don't worry, these are common and have solutions! 💡

🔍 Most Common Causes:

1️⃣ **Order is on hold (ON_HOLD)**
   → Resume the order first from held orders list

2️⃣ **Order is empty**
   → Cannot pay for an order without items

3️⃣ **Payment method disabled**
   → Check if the required payment method is enabled in settings

4️⃣ **Shift is closed**
   → Must open a shift first to process any payment

❓ Does the problem occur before attempting payment or after selecting payment method?`
  },
  orders: {
    ar: `أفهم أن لديك مشكلة في الطلبات. دعني أساعدك! 💡

🔍 الأسباب الأكثر شيوعاً:

1️⃣ **لا يمكن إنشاء طلب جديد**
   → تأكد أن الوردية مفتوحة
   → تأكد من اختيار نوع الطلب (سفري/صالة)

2️⃣ **لا يمكن إضافة أصناف**
   → الطلب قد يكون معلق، استأنفه أولاً
   → الصنف قد يكون غير متوفر

3️⃣ **لا يمكن تعديل الطلب**
   → الطلب المغلق (CLOSED) لا يمكن تعديله
   → استخدم المرتجع بدلاً من التعديل

❓ هل المشكلة في إنشاء الطلب أم في تعديله أم في إضافة الأصناف؟`,
    en: `I understand you're having an order issue. Let me help! 💡

🔍 Most Common Causes:

1️⃣ **Cannot create new order**
   → Make sure shift is open
   → Make sure to select order type (takeaway/dine-in)

2️⃣ **Cannot add items**
   → Order might be on hold, resume it first
   → Item might be unavailable

3️⃣ **Cannot edit order**
   → CLOSED orders cannot be edited
   → Use refund instead of editing

❓ Is the problem with creating the order, editing it, or adding items?`
  },
  refunds: {
    ar: `أفهم أن لديك مشكلة في المرتجعات. هذه العملية لها شروط محددة! 💡

🔍 الأسباب الأكثر شيوعاً:

1️⃣ **لا يظهر خيار المرتجع**
   → المرتجع متاح فقط للطلبات المغلقة (CLOSED)
   → الطلبات المفتوحة تستخدم الإلغاء (Void)

2️⃣ **مبلغ المرتجع غير صحيح**
   → لا يمكن استرجاع أكثر من قيمة الطلب
   → تحقق من المبلغ المتبقي

3️⃣ **لا يظهر الطلب في قائمة المرتجعات**
   → ابحث عن الطلب برقمه
   → تأكد أنه من نفس اليوم

❓ هل الطلب مغلق بالفعل أم لا يزال مفتوحاً؟`,
    en: `I understand you're having a refund issue. This process has specific conditions! 💡

🔍 Most Common Causes:

1️⃣ **Refund option not showing**
   → Refund is only available for CLOSED orders
   → Open orders use Void instead

2️⃣ **Refund amount incorrect**
   → Cannot refund more than order value
   → Check remaining amount

3️⃣ **Order not showing in refunds list**
   → Search for order by number
   → Make sure it's from the same day

❓ Is the order already closed or still open?`
  },
  shifts: {
    ar: `أفهم أن لديك مشكلة في الورديات. دعني أساعدك! 💡

🔍 الأسباب الأكثر شيوعاً:

1️⃣ **لا يمكن فتح وردية**
   → قد تكون هناك وردية مفتوحة بالفعل
   → تأكد من إغلاق الوردية السابقة

2️⃣ **لا يمكن إغلاق الوردية**
   → قد توجد طلبات مفتوحة يجب إغلاقها أولاً
   → تحقق من الطلبات المعلقة

3️⃣ **فرق في الصندوق**
   → هذا تنبيه وليس خطأ
   → راجع عمليات السحب والإيداع

4️⃣ **تقرير Z لا يظهر**
   → يتم إنشاء التقرير عند إغلاق الوردية

❓ هل المشكلة في فتح الوردية أم إغلاقها؟`,
    en: `I understand you're having a shift issue. Let me help! 💡

🔍 Most Common Causes:

1️⃣ **Cannot open shift**
   → There might be an already open shift
   → Make sure to close previous shift

2️⃣ **Cannot close shift**
   → There might be open orders that need to be closed first
   → Check held orders

3️⃣ **Cash difference**
   → This is a warning, not an error
   → Review cash in/out transactions

4️⃣ **Z Report not showing**
   → Report is generated when shift is closed

❓ Is the problem with opening the shift or closing it?`
  },
  inventory: {
    ar: `أفهم أن لديك مشكلة في المخزون. دعني أساعدك! 💡

🔍 الأسباب الأكثر شيوعاً:

1️⃣ **الخصم التلقائي لا يعمل**
   → تأكد أن الصنف مربوط بوصفة
   → تأكد أن المخزون مفعل في الإعدادات

2️⃣ **الكميات غير صحيحة**
   → راجع حركات المخزون
   → قد يكون هناك عملية استلام أو إهدار غير مسجلة

3️⃣ **الصنف لا يظهر**
   → تأكد أن الصنف مفعل
   → تأكد من الفرع الصحيح

❓ هل المشكلة في الخصم التلقائي أم في الكميات أم في إضافة أصناف؟`,
    en: `I understand you're having an inventory issue. Let me help! 💡

🔍 Most Common Causes:

1️⃣ **Auto-deduction not working**
   → Make sure item has a recipe linked
   → Make sure inventory is enabled in settings

2️⃣ **Quantities incorrect**
   → Review inventory transactions
   → There might be unrecorded receiving or waste

3️⃣ **Item not showing**
   → Make sure item is active
   → Make sure you're in the correct branch

❓ Is the problem with auto-deduction, quantities, or adding items?`
  },
  tables: {
    ar: `أفهم أن لديك مشكلة في الطاولات. دعني أساعدك! 💡

🔍 الأسباب الأكثر شيوعاً:

1️⃣ **لا يمكن دمج الطلبات**
   → كلا الطلبين يجب أن يكونا OPEN
   → لا يمكن دمج الطلبات المعلقة

2️⃣ **الطاولة مشغولة**
   → يوجد طلب مفتوح على الطاولة
   → أغلق الطلب أو انقله لطاولة أخرى

3️⃣ **لا يمكن نقل الطلب**
   → الطاولة المستهدفة قد تكون مشغولة
   → استخدم الدمج بدلاً من النقل

❓ هل المشكلة في الدمج أم النقل أم فتح طلب على طاولة؟`,
    en: `I understand you're having a table issue. Let me help! 💡

🔍 Most Common Causes:

1️⃣ **Cannot merge orders**
   → Both orders must be OPEN
   → Cannot merge held orders

2️⃣ **Table is occupied**
   → There's an open order on the table
   → Close the order or move it to another table

3️⃣ **Cannot transfer order**
   → Target table might be occupied
   → Use merge instead of transfer

❓ Is the problem with merging, transferring, or opening an order on a table?`
  },
  z_report: {
    ar: `أفهم أن لديك مشكلة في تقرير Z. دعني أساعدك! 💡

🔍 الأسباب الأكثر شيوعاً:

1️⃣ **التقرير لا يظهر**
   → يتم إنشاء تقرير Z عند إغلاق الوردية فقط
   → تأكد أن الوردية أُغلقت

2️⃣ **الأرقام غير صحيحة**
   → التقرير يشمل فقط الطلبات المغلقة
   → الطلبات المعلقة لا تظهر في التقرير

3️⃣ **لا يمكن طباعة التقرير**
   → تحقق من اتصال الطابعة
   → جرب تحميل PDF بدلاً من الطباعة

❓ هل الوردية مغلقة بالفعل أم لا تزال مفتوحة؟`,
    en: `I understand you're having a Z Report issue. Let me help! 💡

🔍 Most Common Causes:

1️⃣ **Report not showing**
   → Z Report is generated only when shift is closed
   → Make sure shift was closed

2️⃣ **Numbers are incorrect**
   → Report only includes closed orders
   → Held orders don't appear in report

3️⃣ **Cannot print report**
   → Check printer connection
   → Try downloading PDF instead of printing

❓ Is the shift already closed or still open?`
  },
  general: {
    ar: `أفهم أنك تواجه مشكلة. دعني أساعدك في تحديدها! 💡

لكي أساعدك بشكل أفضل، أخبرني:

1️⃣ **في أي شاشة تحدث المشكلة؟**
   • شاشة الكاشير (POS)
   • شاشة المالك
   • شاشة المخزون
   • شاشة التقارير

2️⃣ **ما الذي تحاول فعله؟**
   • إنشاء طلب / دفع / مرتجع
   • فتح أو إغلاق وردية
   • عملية مخزون

3️⃣ **ما هي رسالة الخطأ (إن وجدت)؟**

❓ حدد لي الشاشة والعملية لأعطيك الحل المناسب.`,
    en: `I understand you're facing an issue. Let me help identify it! 💡

To help you better, tell me:

1️⃣ **Which screen is the problem on?**
   • Cashier (POS) screen
   • Owner screen
   • Inventory screen
   • Reports screen

2️⃣ **What are you trying to do?**
   • Create order / Pay / Refund
   • Open or close shift
   • Inventory operation

3️⃣ **What's the error message (if any)?**

❓ Specify the screen and operation so I can give you the right solution.`
  }
};

/**
 * Generate response strictly from Knowledge Base entries
 */
function generateResponseFromKnowledge(
  intent: IntentResult,
  language: "ar" | "en"
): string {
  // Handle system overview intent with built-in responses
  if (intent.intent === "system_overview") {
    return SYSTEM_OVERVIEW_RESPONSES[intent.depth][language];
  }

  // Handle troubleshooting intent with empathetic trainer-like responses
  if (intent.intent === "troubleshoot") {
    const flow = intent.troubleshootFlow || "general";
    return TROUBLESHOOT_RESPONSES[flow]?.[language] || TROUBLESHOOT_RESPONSES.general[language];
  }

  // No matches found
  if (intent.matchedEntryIds.length === 0 || intent.intent === "unknown") {
    return getFallbackResponse(language);
  }

  // Get the matched entries
  const entries: KnowledgeEntry[] = intent.matchedEntryIds
    .map(id => getEntryById(id))
    .filter((e): e is KnowledgeEntry => e !== null);

  if (entries.length === 0) {
    return getFallbackResponse(language);
  }

  // For detailed responses, return full content
  if (intent.depth === "detailed") {
    return entries.map(entry => entry.content[language]).join("\n\n---\n\n");
  }

  // For brief responses, return shortened content
  const primaryEntry = entries[0];
  const content = primaryEntry.content[language];
  
  // Get first 5-6 meaningful lines for brief
  const lines = content.split("\n").filter(line => line.trim());
  const briefContent = lines.slice(0, 6).join("\n");
  
  // Add follow-up hint if there's more content
  if (lines.length > 6) {
    const moreHint = language === "ar" 
      ? "\n\n💡 اكتب \"اشرح أكثر\" لمزيد من التفاصيل"
      : "\n\n💡 Type \"explain more\" for more details";
    return briefContent + moreHint;
  }

  return briefContent;
}
