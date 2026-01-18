import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KnowledgeEntrySummary {
  id: string;
  title: string;
  keywords: string[];
}

interface IntentRequest {
  userQuery: string;
  language: "ar" | "en";
  knowledgeEntries: KnowledgeEntrySummary[];
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface IntentResponse {
  intent: "report" | "training" | "explanation" | "example" | "follow_up" | "system_overview" | "unknown";
  matchedEntryIds: string[];
  depth: "brief" | "detailed";
  reasoning: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { userQuery, language, knowledgeEntries, conversationHistory }: IntentRequest = await req.json();

    if (!userQuery || !knowledgeEntries) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userQuery, knowledgeEntries" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a compact representation of the knowledge base for the prompt
    const knowledgeSummary = knowledgeEntries.map(e => 
      `- ID: ${e.id}, Title: ${e.title}, Keywords: [${e.keywords.join(", ")}]`
    ).join("\n");

    // Build conversation context if available
    const conversationContext = conversationHistory && conversationHistory.length > 0
      ? `\n\nPrevious conversation:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join("\n")}`
      : "";

    const systemPrompt = `You are an intent classifier for Kastana POS system assistant.
You are NOT allowed to answer questions from your own knowledge. You can ONLY identify intent and match to provided knowledge entries.

Your job is to:
1. Understand the user's question
2. Identify the user's intent (report, training, explanation, example, follow_up, system_overview, unknown)
3. Find the most relevant knowledge entry IDs from the provided list
4. Determine if user wants brief or detailed answer

IMPORTANT RULES:
- ONLY use the knowledge entries provided below. Do not invent answers.
- If user asks about the system in general, overview, what is Kastana, "نبذة عن النظام", "اشرحلي النظام", "شرح النظام", "عن النظام", "ما هو كاستنا", "what is Kastana", "system overview", "explain the system", intent is "system_overview" with depth "brief". Do NOT return unknown for these.
- If user says "اشرح أكثر" or "more details" or "explain more", intent is "follow_up" and depth is "detailed"
- If user asks "ما هو" / "what is" / "كيف" / "how" about a SPECIFIC feature, intent is "explanation"
- If user mentions "تقرير" / "report", intent is "report"
- If user asks for "مثال" / "example", intent is "example"
- If user wants to learn the system step by step, intent is "training"

Knowledge Base Entries:
${knowledgeSummary}

Respond ONLY with a valid JSON object in this exact format:
{
  "intent": "report" | "training" | "explanation" | "example" | "follow_up" | "system_overview" | "unknown",
  "matchedEntryIds": ["entry_id_1", "entry_id_2"],
  "depth": "brief" | "detailed",
  "reasoning": "Brief explanation of why you matched these entries"
}`;

    const userMessage = `User query (${language}): "${userQuery}"${conversationContext}

Identify the intent and find matching knowledge entries. Return JSON only.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const aiContent = aiResult.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from AI
    let intentResult: IntentResponse;
    try {
      // Extract JSON from potential markdown code blocks
      let jsonStr = aiContent.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
      }
      intentResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      // Fallback: return unknown intent
      intentResult = {
        intent: "unknown",
        matchedEntryIds: [],
        depth: "brief",
        reasoning: "Could not parse AI response",
      };
    }

    // Validate matchedEntryIds against provided entries
    const validEntryIds = new Set(knowledgeEntries.map(e => e.id));
    intentResult.matchedEntryIds = intentResult.matchedEntryIds.filter(id => validEntryIds.has(id));

    return new Response(
      JSON.stringify(intentResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("assistant-intent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
