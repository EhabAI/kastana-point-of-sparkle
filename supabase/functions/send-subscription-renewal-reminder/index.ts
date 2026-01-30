import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ReminderStage = "7_DAYS" | "1_DAY" | "EXPIRED";

interface ReminderRequest {
  mode: "manual";
  restaurant_id: string;
  stage: ReminderStage;
}

// Email templates (bilingual)
const getEmailContent = (stage: ReminderStage, restaurantName: string) => {
  const templates: Record<ReminderStage, { subject: string; html: string }> = {
    "7_DAYS": {
      subject: `تذكير: اشتراك ${restaurantName} ينتهي قريباً | Subscription Expiring Soon`,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f9fafb; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 20px 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Kastana POS</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1e40af; margin-top: 0;">تذكير بتجديد الاشتراك</h2>
            <p style="color: #374151; line-height: 1.8; font-size: 16px;">
              عزيزنا صاحب <strong>${restaurantName}</strong>،
            </p>
            <p style="color: #374151; line-height: 1.8; font-size: 16px;">
              نود تذكيركم بأن اشتراككم في نظام <strong>Kastana POS</strong> سينتهي خلال <strong>٧ أيام</strong>.
            </p>
            <p style="color: #374151; line-height: 1.8; font-size: 16px;">
              للحفاظ على استمرارية خدماتكم دون انقطاع، يرجى التواصل معنا لتجديد الاشتراك.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            <div dir="ltr" style="text-align: left;">
              <h3 style="color: #1e40af;">Subscription Renewal Reminder</h3>
              <p style="color: #374151; line-height: 1.8; font-size: 16px;">
                Dear <strong>${restaurantName}</strong> owner,
              </p>
              <p style="color: #374151; line-height: 1.8; font-size: 16px;">
                Your <strong>Kastana POS</strong> subscription will expire in <strong>7 days</strong>.
              </p>
              <p style="color: #374151; line-height: 1.8; font-size: 16px;">
                To ensure uninterrupted service, please contact us to renew your subscription.
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px; padding: 15px; background-color: #f0f9ff; border-radius: 8px;">
              <p style="color: #0369a1; margin: 0; font-size: 14px;">
                فريق Kastana POS | Kastana POS Team
              </p>
            </div>
          </div>
        </div>
      `,
    },
    "1_DAY": {
      subject: `عاجل: اشتراك ${restaurantName} ينتهي غداً | Subscription Expires Tomorrow`,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #fef2f2; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Kastana POS</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #d97706; margin-top: 0;">تنبيه عاجل - الاشتراك ينتهي غداً</h2>
            <p style="color: #374151; line-height: 1.8; font-size: 16px;">
              عزيزنا صاحب <strong>${restaurantName}</strong>،
            </p>
            <p style="color: #374151; line-height: 1.8; font-size: 16px;">
              اشتراككم في نظام <strong>Kastana POS</strong> سينتهي <strong>غداً</strong>.
            </p>
            <p style="color: #374151; line-height: 1.8; font-size: 16px;">
              بعد انتهاء الاشتراك، لن تتمكنوا من استخدام النظام. يرجى التواصل معنا فوراً لتجنب أي انقطاع في الخدمة.
            </p>
            <hr style="border: none; border-top: 1px solid #fecaca; margin: 25px 0;">
            <div dir="ltr" style="text-align: left;">
              <h3 style="color: #d97706;">Urgent - Subscription Expires Tomorrow</h3>
              <p style="color: #374151; line-height: 1.8; font-size: 16px;">
                Dear <strong>${restaurantName}</strong> owner,
              </p>
              <p style="color: #374151; line-height: 1.8; font-size: 16px;">
                Your <strong>Kastana POS</strong> subscription expires <strong>tomorrow</strong>.
              </p>
              <p style="color: #374151; line-height: 1.8; font-size: 16px;">
                After expiration, you will not be able to use the system. Please contact us immediately to avoid service interruption.
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px; padding: 15px; background-color: #fef3c7; border-radius: 8px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                فريق Kastana POS | Kastana POS Team
              </p>
            </div>
          </div>
        </div>
      `,
    },
    "EXPIRED": {
      subject: `انتهى اشتراك ${restaurantName} | Subscription Expired`,
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #fef2f2; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 20px 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔴 Kastana POS</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #b91c1c; margin-top: 0;">انتهى الاشتراك</h2>
            <p style="color: #374151; line-height: 1.8; font-size: 16px;">
              عزيزنا صاحب <strong>${restaurantName}</strong>،
            </p>
            <p style="color: #374151; line-height: 1.8; font-size: 16px;">
              نود إعلامكم بأن اشتراككم في نظام <strong>Kastana POS</strong> قد <strong>انتهى</strong>.
            </p>
            <p style="color: #374151; line-height: 1.8; font-size: 16px;">
              النظام غير متاح حالياً. للعودة للاستخدام الفوري، يرجى التواصل معنا لتجديد اشتراككم.
            </p>
            <hr style="border: none; border-top: 1px solid #fecaca; margin: 25px 0;">
            <div dir="ltr" style="text-align: left;">
              <h3 style="color: #b91c1c;">Subscription Expired</h3>
              <p style="color: #374151; line-height: 1.8; font-size: 16px;">
                Dear <strong>${restaurantName}</strong> owner,
              </p>
              <p style="color: #374151; line-height: 1.8; font-size: 16px;">
                Your <strong>Kastana POS</strong> subscription has <strong>expired</strong>.
              </p>
              <p style="color: #374151; line-height: 1.8; font-size: 16px;">
                The system is currently unavailable. To resume using the service, please contact us to renew your subscription.
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px; padding: 15px; background-color: #fee2e2; border-radius: 8px;">
              <p style="color: #991b1b; margin: 0; font-size: 14px;">
                فريق Kastana POS | Kastana POS Team
              </p>
            </div>
          </div>
        </div>
      `,
    },
  };

  return templates[stage];
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the authorization header to verify system admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is a system_admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is system_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "system_admin")
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: System admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: ReminderRequest = await req.json();
    const { mode, restaurant_id, stage } = body;

    // Validate mode
    if (mode !== "manual") {
      return new Response(
        JSON.stringify({ error: "Only manual mode is supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate stage
    if (!["7_DAYS", "1_DAY", "EXPIRED"].includes(stage)) {
      return new Response(
        JSON.stringify({ error: "Invalid reminder stage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get restaurant info
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, owner_id, last_renewal_reminder_stage")
      .eq("id", restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return new Response(
        JSON.stringify({ error: "Restaurant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate reminder
    if (restaurant.last_renewal_reminder_stage === stage) {
      return new Response(
        JSON.stringify({ 
          error: "Duplicate reminder",
          message: `Reminder for stage '${stage}' has already been sent for this restaurant`
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get owner email
    if (!restaurant.owner_id) {
      return new Response(
        JSON.stringify({ error: "Restaurant has no owner assigned" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: ownerData, error: ownerError } = await supabaseAdmin.auth.admin.getUserById(
      restaurant.owner_id
    );

    if (ownerError || !ownerData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve owner email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ownerEmail = ownerData.user.email;

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Get email content
    const emailContent = getEmailContent(stage, restaurant.name);

    // Send email
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "Kastana POS <onboarding@resend.dev>",
      to: [ownerEmail],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (emailError) {
      console.error("[send-subscription-renewal-reminder] Email error:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update restaurant with last reminder stage
    const { error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({ last_renewal_reminder_stage: stage })
      .eq("id", restaurant_id);

    if (updateError) {
      console.error("[send-subscription-renewal-reminder] Update error:", updateError);
      // Email was sent, so we still log the audit but report partial success
    }

    // Log to audit_logs
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurant_id,
      entity_type: "subscription",
      entity_id: restaurant_id,
      action: "SUBSCRIPTION_RENEWAL_REMINDER_SENT",
      details: {
        reminder_stage: stage,
        sent_by: "SYSTEM_ADMIN",
        sent_to_email: ownerEmail,
        email_id: emailResult?.id || null,
      },
    });

    console.log(`[send-subscription-renewal-reminder] Sent ${stage} reminder to ${ownerEmail} for ${restaurant.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reminder sent successfully`,
        stage,
        sent_to: ownerEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[send-subscription-renewal-reminder] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
