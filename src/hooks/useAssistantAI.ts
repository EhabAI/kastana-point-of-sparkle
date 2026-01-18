import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  KnowledgeEntry, 
  getEntryById, 
  getFallbackResponse,
  getAllTopics
} from "@/lib/assistantKnowledge";
import { 
  matchUIElement, 
  formatUIElementResponse,
  getScreenUIElements,
  type UIElementMatch 
} from "@/lib/assistantUIResolver";
import { 
  isTopicAllowedOnScreen,
  buildSafeFallbackResponse,
  getScreenName,
  type FeatureVisibility
} from "@/lib/assistantScreenLock";
import {
  buildV2Context,
  formatV2Response,
  classifySoftIntent,
  shouldHideFeature,
  type V2SystemContext,
  type V2SoftIntent,
} from "@/lib/assistantV2Context";
import type { ScreenContext } from "@/lib/smartAssistantContext";

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

interface FallbackContext {
  displayName?: string;
  screenContext?: string;
  userRole?: string;
  featureVisibility?: FeatureVisibility;
  // V2 Context Enrichment fields
  shiftOpen?: boolean;
  restaurantActive?: boolean;
  hasOpenOrders?: boolean;
}

interface UseAssistantAIReturn {
  processQuery: (query: string, language: "ar" | "en", fallbackContext?: FallbackContext) => Promise<string>;
  isLoading: boolean;
  lastIntent: IntentResult | null;
  lastUIMatch: UIElementMatch | null;
  lastSoftIntent: V2SoftIntent | null;
  error: string | null;
}

/**
 * Hook to integrate AI intent understanding with the Knowledge Base
 * 
 * PRODUCTION RULES ENFORCED:
 * 1. SCREEN LOCK - Only respond about current screen features
 * 2. UI KEYWORD OVERRIDE - Direct UI matches bypass AI
 * 3. SAFE FALLBACK - Never ask to clarify, explain primary element
 * 4. ROLE & FEATURE AWARENESS - Respect disabled features
 * 5. AI BOUNDARY - AI only phrases responses, doesn't decide actions
 */
export function useAssistantAI(): UseAssistantAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastIntent, setLastIntent] = useState<IntentResult | null>(null);
  const [lastUIMatch, setLastUIMatch] = useState<UIElementMatch | null>(null);
  const [lastSoftIntent, setLastSoftIntent] = useState<V2SoftIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of last matched entry for follow-up questions
  const lastMatchedEntryRef = useRef<string | null>(null);
  
  // Keep recent conversation for context
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);
  
  // V2: Track question count for adaptive tone
  const questionCountRef = useRef<number>(0);

  const processQuery = useCallback(async (
    query: string, 
    language: "ar" | "en",
    fallbackContext?: FallbackContext
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    setLastUIMatch(null);
    setLastSoftIntent(null);
    
    // V2: Increment question count for adaptive tone
    questionCountRef.current += 1;
    
    // V2: Build enriched context
    const screenContext = fallbackContext?.screenContext as ScreenContext | undefined;
    const v2Context: V2SystemContext | null = screenContext ? buildV2Context(
      screenContext,
      fallbackContext?.userRole || null,
      fallbackContext?.displayName,
      fallbackContext?.shiftOpen ?? false,
      fallbackContext?.restaurantActive ?? true,
      fallbackContext?.hasOpenOrders ?? false,
      fallbackContext?.featureVisibility,
      language
    ) : null;
    
    // V2: Classify soft intent (question type only, not destination)
    const softIntent = classifySoftIntent(query, language);
    setLastSoftIntent(softIntent);
    
    try {
      // ===== V2 UI-FIRST INTENT RESOLUTION (Rule 4) =====
      // Priority 1: Exact UI keyword match on current screen
      // This has HIGHER priority than AI intent classification
      if (screenContext) {
        const uiMatch = matchUIElement(query, screenContext, language);
        
        if (uiMatch && uiMatch.confidence >= 0.6) {
          // V2: Check if this element should be hidden
          if (v2Context && shouldHideFeature(uiMatch.elementId, v2Context)) {
            // Element is hidden/disabled - fall through to screen-level response
          } else {
            // Direct UI element match found - respond immediately without AI
            setLastUIMatch(uiMatch);
            setIsLoading(false);
            
            let response = formatUIElementResponse(uiMatch, language);
            
            // V2: Add smart suggestions
            if (v2Context) {
              response = formatV2Response(response, v2Context, true);
            }
            
            // Update conversation history
            conversationHistoryRef.current.push({ role: "user", content: query });
            conversationHistoryRef.current.push({ role: "assistant", content: response });
            
            // Keep only last 6 messages
            if (conversationHistoryRef.current.length > 6) {
              conversationHistoryRef.current = conversationHistoryRef.current.slice(-6);
            }
            
            return response;
          }
        }
      }
      // ===== END V2 UI-FIRST RESOLUTION =====
      
      // ===== V2 SCREEN-LOCK ENFORCEMENT (V1 Rule 1 + V2 Rule 2) =====
      // No UI match found - proceed with AI intent classification
      // Get all knowledge entry summaries for the AI
      // IMPORTANT: Filter by screen context AND feature visibility
      const topics = getAllTopics(language);
      const knowledgeEntries = topics
        .filter(t => {
          // V1: Filter by screen context
          if (screenContext && !isTopicAllowedOnScreen(t.id, screenContext)) {
            return false;
          }
          // V2: Filter by feature visibility
          if (v2Context && shouldHideFeature(t.id, v2Context)) {
            return false;
          }
          return true;
        })
        .map(t => {
          const entry = getEntryById(t.id);
          return {
            id: t.id,
            title: t.title,
            keywords: entry ? [...entry.keywords.ar, ...entry.keywords.en] : [],
          };
        });

      // Call the edge function with screen context for locked responses
      const { data, error: fnError } = await supabase.functions.invoke("assistant-intent", {
        body: {
          userQuery: query,
          language,
          knowledgeEntries,
          conversationHistory: conversationHistoryRef.current.slice(-4), // Last 2 exchanges
          screenContext: screenContext, // Pass screen context for AI awareness
        },
      });

      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error(fnError.message || "AI service error");
      }

      // Handle rate limit or payment errors
      if (data?.error) {
        setError(data.error);
        // PRODUCTION RULE 3: Safe fallback - don't ask to clarify
        return getFallbackResponse(language, fallbackContext);
      }

      const intentResult: IntentResult = data;
      setLastIntent(intentResult);

      // Handle follow-up questions
      if (intentResult.intent === "follow_up" && lastMatchedEntryRef.current) {
        // Use the last matched entry for detailed response
        intentResult.matchedEntryIds = [lastMatchedEntryRef.current];
        intentResult.depth = "detailed";
      }

      // ===== SCREEN-LOCK VALIDATION =====
      // PRODUCTION RULE 1: Validate matched entries are allowed on current screen
      if (screenContext && intentResult.matchedEntryIds.length > 0) {
        const allowedEntries = intentResult.matchedEntryIds.filter(id => 
          isTopicAllowedOnScreen(id, screenContext)
        );
        
        // If all entries were filtered out, return screen-locked fallback
        if (allowedEntries.length === 0) {
          return buildSafeFallbackResponse(screenContext, language, fallbackContext?.displayName);
        }
        
        intentResult.matchedEntryIds = allowedEntries;
      }
      // ===== END SCREEN-LOCK VALIDATION =====

      // Generate response from Knowledge Base
      let response = generateResponseFromKnowledge(
        intentResult,
        language,
        fallbackContext
      );
      
      // V2: Add smart suggestions to response
      if (v2Context) {
        response = formatV2Response(response, v2Context, true);
      }

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
      // Return contextual fallback on error
      return getFallbackResponse(language, fallbackContext);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { processQuery, isLoading, lastIntent, lastUIMatch, lastSoftIntent, error };
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
  csv_inventory: {
    ar: `أفهم أن لديك مشكلة في تحميل ملف CSV للمخزون. هذه من أكثر العمليات التي تحتاج دقة! 💡

🔍 الأسباب الأكثر شيوعاً لفشل استيراد CSV المخزون:

1️⃣ **أسماء الأعمدة غير صحيحة**
   → الأعمدة المطلوبة: item_name, unit, quantity, cost
   → تأكد من كتابتها بالإنجليزية بالضبط كما هو مطلوب
   → لا تستخدم أسماء عربية للأعمدة

2️⃣ **تكرار أسماء الأصناف**
   → كل صنف يجب أن يكون باسم فريد
   → راجع الملف بحثاً عن تكرارات

3️⃣ **قيم الوحدات غير صالحة**
   → الوحدات يجب أن تكون موجودة مسبقاً في النظام
   → أضف الوحدات أولاً من إعدادات المخزون

4️⃣ **كميات فارغة أو صفرية**
   → لا تترك حقل الكمية فارغاً
   → الكمية يجب أن تكون رقم موجب

5️⃣ **المخزون غير مفعل**
   → تأكد أن ميزة المخزون مفعلة في إعدادات المطعم

6️⃣ **مشكلة الترميز (Encoding)**
   → احفظ الملف بترميز UTF-8
   → تجنب الرموز الخاصة في الأسماء

⚠️ ملاحظة: المخزون في Kastana على مستوى الفرع. تأكد من اختيار الفرع الصحيح.

❓ هل يظهر الخطأ قبل المعاينة (Preview) أم بعد تأكيد الاستيراد؟`,
    en: `I understand you're having an issue with Inventory CSV import. This operation requires precision! 💡

🔍 Most Common Causes for Inventory CSV Import Failure:

1️⃣ **Incorrect column names**
   → Required columns: item_name, unit, quantity, cost
   → Make sure to use exact English names as required
   → Don't use Arabic column names

2️⃣ **Duplicate item names**
   → Each item must have a unique name
   → Check the file for duplicates

3️⃣ **Invalid unit values**
   → Units must already exist in the system
   → Add units first from Inventory Settings

4️⃣ **Empty or zero quantities**
   → Don't leave quantity field empty
   → Quantity must be a positive number

5️⃣ **Inventory not enabled**
   → Make sure inventory feature is enabled in restaurant settings

6️⃣ **Encoding issue**
   → Save the file with UTF-8 encoding
   → Avoid special characters in names

⚠️ Note: Inventory in Kastana is branch-level. Make sure to select the correct branch.

❓ Does the error appear before Preview or after confirming import?`
  },
  csv_recipes: {
    ar: `أفهم أن لديك مشكلة في تحميل ملف CSV للوصفات. دعني أساعدك! 💡

🔍 الأسباب الأكثر شيوعاً لفشل استيراد CSV الوصفات:

1️⃣ **الصنف المرتبط غير موجود**
   → الوصفة يجب أن ترتبط بصنف قائمة موجود
   → أضف أصناف القائمة أولاً

2️⃣ **مكونات الوصفة غير موجودة في المخزون**
   → كل مكون في الوصفة يجب أن يكون صنف مخزون موجود
   → أضف أصناف المخزون أولاً ثم الوصفات

3️⃣ **كمية أو وحدة غير صالحة**
   → الكمية يجب أن تكون رقم موجب
   → الوحدة يجب أن تكون موجودة في النظام

4️⃣ **تكرار الوصفات**
   → لا يمكن إنشاء وصفتين لنفس الصنف
   → الوصفة الجديدة قد تحل محل القديمة

5️⃣ **المخزون غير مفعل**
   → لا يمكن إضافة وصفات إذا كان المخزون معطل
   → فعّل المخزون من الإعدادات أولاً

6️⃣ **عدم تطابق أسماء الأعمدة**
   → تأكد من أسماء الأعمدة المطلوبة في القالب
   → استخدم القالب المتوفر في النظام

⚠️ ملاحظة: الوصفات تعتمد على أصناف المخزون. يجب إضافة المخزون أولاً.

❓ هل أصناف المخزون موجودة بالفعل أم تحاول استيراد كل شيء معاً؟`,
    en: `I understand you're having an issue with Recipes CSV import. Let me help! 💡

🔍 Most Common Causes for Recipes CSV Import Failure:

1️⃣ **Linked menu item doesn't exist**
   → Recipe must be linked to an existing menu item
   → Add menu items first

2️⃣ **Recipe ingredients don't exist in inventory**
   → Each ingredient must be an existing inventory item
   → Add inventory items first, then recipes

3️⃣ **Invalid quantity or unit**
   → Quantity must be a positive number
   → Unit must exist in the system

4️⃣ **Duplicate recipes**
   → Cannot create two recipes for the same item
   → New recipe may replace the old one

5️⃣ **Inventory not enabled**
   → Cannot add recipes if inventory is disabled
   → Enable inventory from settings first

6️⃣ **Column name mismatch**
   → Make sure column names match the required template
   → Use the template provided in the system

⚠️ Note: Recipes depend on inventory items. You must add inventory first.

❓ Do inventory items already exist or are you trying to import everything together?`
  },
  csv_general: {
    ar: `أفهم أن لديك مشكلة في تحميل ملف CSV. دعني أساعدك في تحديدها! 💡

في Kastana POS يوجد نوعان من ملفات CSV:

📦 **CSV المخزون** - لإضافة أصناف المخزون (مواد خام)
📝 **CSV الوصفات** - لربط أصناف القائمة بمكونات المخزون

🔍 مشاكل عامة شائعة:

1️⃣ **ترميز الملف**
   → احفظ الملف بترميز UTF-8
   → افتح الملف في Excel واحفظه كـ CSV UTF-8

2️⃣ **الفواصل**
   → استخدم فاصلة (,) وليس فاصلة منقوطة (;)

3️⃣ **الصف الأول**
   → يجب أن يحتوي على أسماء الأعمدة
   → لا تبدأ بصف بيانات مباشرة

4️⃣ **أحرف خاصة**
   → تجنب الرموز الخاصة مثل #، @، %
   → استخدم أسماء بسيطة

❓ هل المشكلة في ملف المخزون أم الوصفات؟ حدد لي لأعطيك التفاصيل الدقيقة.`,
    en: `I understand you're having a CSV file import issue. Let me help identify it! 💡

In Kastana POS there are two types of CSV files:

📦 **Inventory CSV** - To add inventory items (raw materials)
📝 **Recipes CSV** - To link menu items with inventory ingredients

🔍 Common General Issues:

1️⃣ **File encoding**
   → Save file with UTF-8 encoding
   → Open in Excel and save as CSV UTF-8

2️⃣ **Separators**
   → Use comma (,) not semicolon (;)

3️⃣ **First row**
   → Must contain column names
   → Don't start with data directly

4️⃣ **Special characters**
   → Avoid special symbols like #, @, %
   → Use simple names

❓ Is the problem with the inventory file or recipes file? Specify so I can give you exact details.`
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
  language: "ar" | "en",
  fallbackContext?: FallbackContext
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

  // No matches found - use contextual fallback
  if (intent.matchedEntryIds.length === 0 || intent.intent === "unknown") {
    return getFallbackResponse(language, fallbackContext);
  }

  // Get the matched entries
  const entries: KnowledgeEntry[] = intent.matchedEntryIds
    .map(id => getEntryById(id))
    .filter((e): e is KnowledgeEntry => e !== null);

  if (entries.length === 0) {
    return getFallbackResponse(language, fallbackContext);
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
