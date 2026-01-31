// Supabase backend function: system-admin-reset-password
// Allows system_admin to reset any user's password

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorCode = 'not_authorized' | 'weak_password' | 'user_not_found' | 'unexpected'

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
      console.error('Missing required env vars for system-admin-reset-password')
      return errorResponse('unexpected', 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return errorResponse('not_authorized', 401)
    }

    const body = (await req.json().catch(() => null)) as null | {
      user_id?: string
      new_password?: string
    }
    
    const targetUserId = body?.user_id
    const newPassword = body?.new_password

    if (!targetUserId || !newPassword) {
      return errorResponse('unexpected', 400)
    }

    // Quick weak password check for clearer UX
    if (newPassword.length < 6) {
      return errorResponse('weak_password', 400)
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

    // Service-role client to update password
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Verify the target user exists
    const { data: targetUser, error: targetErr } = await serviceClient.auth.admin.getUserById(targetUserId)

    if (targetErr || !targetUser?.user) {
      return errorResponse('user_not_found', 404)
    }

    // Update the password
    const { error: updateErr } = await serviceClient.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateErr) {
      console.error('Password update failed', updateErr)
      return errorResponse('unexpected', 500)
    }

    console.log(`Password reset successfully for user: ${targetUserId} by system_admin: ${callerId}`)
    return json({ success: true }, 200)
  } catch (e) {
    console.error('system-admin-reset-password unexpected error', e)
    return errorResponse('unexpected', 500)
  }
})
