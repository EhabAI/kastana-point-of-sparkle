// Supabase backend function: system-admin-update-email
// Allows system_admin to update any user's email

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorCode = 'not_authorized' | 'invalid_email' | 'user_not_found' | 'email_taken' | 'unexpected'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function errorResponse(code: ErrorCode, status = 400) {
  return json({ error: { code } }, status)
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('Missing required env vars for system-admin-update-email')
      return errorResponse('unexpected', 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return errorResponse('not_authorized', 401)
    }

    const body = (await req.json().catch(() => null)) as null | {
      user_id?: string
      new_email?: string
    }
    
    const targetUserId = body?.user_id
    const newEmail = body?.new_email

    if (!targetUserId || !newEmail) {
      return errorResponse('unexpected', 400)
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return errorResponse('invalid_email', 400)
    }

    // Client authenticated as the caller (JWT from Authorization header)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return errorResponse('not_authorized', 401)
    }

    const callerId = userData.user.id

    // Check if caller is system_admin
    const { data: isSystemAdmin, error: adminErr } = await userClient.rpc('has_role', {
      _user_id: callerId,
      _role: 'system_admin',
    })

    if (adminErr || !isSystemAdmin) {
      console.error('System admin role check failed', adminErr)
      return errorResponse('not_authorized', 403)
    }

    // Service-role client to update email
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Verify the target user exists
    const { data: targetUser, error: targetErr } = await serviceClient.auth.admin.getUserById(targetUserId)

    if (targetErr || !targetUser?.user) {
      return errorResponse('user_not_found', 404)
    }

    // Update the email (skip email confirmation for admin updates)
    const { error: updateErr } = await serviceClient.auth.admin.updateUserById(
      targetUserId,
      { email: newEmail, email_confirm: true }
    )

    if (updateErr) {
      console.error('Email update failed', updateErr)
      if (updateErr.message?.includes('already registered') || updateErr.message?.includes('duplicate')) {
        return errorResponse('email_taken', 400)
      }
      return errorResponse('unexpected', 500)
    }

    // Update the profiles table as well
    const { error: profileErr } = await serviceClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', targetUserId)

    if (profileErr) {
      console.error('Profile email update failed (non-fatal)', profileErr)
    }

    console.log(`Email updated successfully for user: ${targetUserId} by system_admin: ${callerId}`)
    return json({ success: true }, 200)
  } catch (e) {
    console.error('system-admin-update-email unexpected error', e)
    return errorResponse('unexpected', 500)
  }
})
