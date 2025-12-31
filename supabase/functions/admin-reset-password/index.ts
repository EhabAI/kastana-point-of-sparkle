// Supabase backend function: admin-reset-password
// Resets a user's password, callable by owners for their cashiers.

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

function errorResponse(code: ErrorCode, message: string, status = 400) {
  return json({ error: { code, message } }, status)
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
      console.error('Missing required env vars for admin-reset-password')
      return errorResponse('unexpected', 'Unexpected error. Please try again.', 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return errorResponse('not_authorized', 'Please sign in to perform this action.', 401)
    }

    const body = (await req.json().catch(() => null)) as null | {
      user_id?: string
      new_password?: string
      restaurant_id?: string
    }
    
    const targetUserId = body?.user_id
    const newPassword = body?.new_password
    const restaurantId = body?.restaurant_id

    if (!targetUserId || !newPassword || !restaurantId) {
      return errorResponse('unexpected', 'Please provide user_id, new_password, and restaurant_id.', 400)
    }

    // Quick weak password check for clearer UX
    if (newPassword.length < 6) {
      return errorResponse('weak_password', 'Password is too weak. Use at least 6 characters.', 400)
    }

    // Client authenticated as the caller (JWT from Authorization header)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return errorResponse('not_authorized', 'Your session is invalid. Please sign in again.', 401)
    }

    const callerId = userData.user.id

    // Check if caller is owner
    const { data: isOwner, error: ownerErr } = await userClient.rpc('has_role', {
      _user_id: callerId,
      _role: 'owner',
    })

    if (ownerErr || !isOwner) {
      console.error('Owner role check failed', ownerErr)
      return errorResponse('not_authorized', 'Only restaurant owners can reset cashier passwords.', 403)
    }

    // Verify the owner owns this restaurant
    const { data: ownerRestaurantId, error: restErr } = await userClient.rpc('get_owner_restaurant_id', {
      _user_id: callerId,
    })
    
    if (restErr || ownerRestaurantId !== restaurantId) {
      return errorResponse('not_authorized', 'You can only reset passwords for cashiers in your own restaurant.', 403)
    }

    // Service-role client to update password + bypass RLS safely
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Verify the target user is a cashier in this restaurant
    const { data: targetRole, error: roleErr } = await serviceClient
      .from('user_roles')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('restaurant_id', restaurantId)
      .eq('role', 'cashier')
      .single()

    if (roleErr || !targetRole) {
      return errorResponse('user_not_found', 'Cashier not found in your restaurant.', 404)
    }

    // Update the password
    const { error: updateErr } = await serviceClient.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateErr) {
      console.error('Password update failed', updateErr)
      return errorResponse('unexpected', 'Failed to reset password. Please try again.', 500)
    }

    // Log the action in audit_logs
    const { error: auditErr } = await serviceClient
      .from('audit_logs')
      .insert({
        user_id: callerId,
        restaurant_id: restaurantId,
        action: 'password_reset',
        entity_type: 'cashier',
        entity_id: targetUserId,
        details: { reset_by: callerId, target_email: targetRole.branch_id }
      })

    if (auditErr) {
      console.error('Audit log insert failed (non-fatal)', auditErr)
    }

    console.log(`Password reset successfully for user: ${targetUserId} by owner: ${callerId}`)
    return json({ success: true }, 200)
  } catch (e) {
    console.error('admin-reset-password unexpected error', e)
    return errorResponse('unexpected', 'Unexpected error. Please try again.', 500)
  }
})
