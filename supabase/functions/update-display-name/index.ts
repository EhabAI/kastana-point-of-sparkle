// Supabase backend function: update-display-name
// Updates the username for a user with proper authorization and audit logging

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorCode = 'not_authorized' | 'invalid_input' | 'user_not_found' | 'unexpected'

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required env vars for update-display-name')
      return errorResponse('unexpected', 500)
    }

    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      console.error('Missing or invalid Authorization header')
      return errorResponse('not_authorized', 401)
    }

    const jwt = authHeader.replace(/^bearer\s+/i, '')

    // Parse request body
    const body = (await req.json().catch(() => null)) as null | {
      user_id?: string
      new_username?: string
      restaurant_id?: string
    }
    
    const targetUserId = body?.user_id
    const newUsername = body?.new_username?.trim()
    const restaurantId = body?.restaurant_id

    if (!targetUserId || !newUsername) {
      return errorResponse('invalid_input', 400)
    }

    // Validate username
    if (newUsername.length < 2) {
      return errorResponse('invalid_input', 400)
    }

    // Create service-role client for ALL privileged operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Step 1: Verify caller identity using JWT
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt)
    
    if (userErr || !userData?.user) {
      console.error('JWT verification failed:', userErr?.message || 'No user data')
      return errorResponse('not_authorized', 401)
    }

    const callerId = userData.user.id
    console.log(`Caller verified: ${callerId}`)

    // Step 2: Get caller's role
    const { data: callerRole, error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .select('role, restaurant_id')
      .eq('user_id', callerId)
      .eq('is_active', true)
      .single()

    if (roleErr || !callerRole) {
      console.error('Role lookup failed:', roleErr?.message || 'No role found')
      return errorResponse('not_authorized', 403)
    }

    console.log(`Caller role: ${callerRole.role}`)

    // Step 3: Get target user's role
    const { data: targetRole, error: targetRoleErr } = await supabaseAdmin
      .from('user_roles')
      .select('role, restaurant_id')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .single()

    if (targetRoleErr || !targetRole) {
      console.error('Target role lookup failed:', targetRoleErr?.message || 'No role found')
      return errorResponse('user_not_found', 404)
    }

    console.log(`Target role: ${targetRole.role}`)

    // Step 4: Authorization rules
    let authorized = false
    let auditAction = ''

    // System admin can edit ANY user's username
    if (callerRole.role === 'system_admin') {
      authorized = true
      auditAction = targetRole.role === 'owner' ? 'OWNER_DISPLAY_NAME_UPDATED' : 'STAFF_DISPLAY_NAME_UPDATED'
    }
    // Owner can only edit cashier/kitchen in their restaurant
    else if (callerRole.role === 'owner') {
      // Cannot edit themselves
      if (callerId === targetUserId) {
        return errorResponse('not_authorized', 403)
      }
      // Can only edit cashier/kitchen roles
      if (targetRole.role !== 'cashier' && targetRole.role !== 'kitchen') {
        return errorResponse('not_authorized', 403)
      }
      // Must be same restaurant
      if (callerRole.restaurant_id !== targetRole.restaurant_id) {
        return errorResponse('not_authorized', 403)
      }
      authorized = true
      auditAction = 'STAFF_DISPLAY_NAME_UPDATED'
    }
    // Cashier and Kitchen cannot edit usernames
    else {
      return errorResponse('not_authorized', 403)
    }

    if (!authorized) {
      return errorResponse('not_authorized', 403)
    }

    // Step 5: Get current username for audit
    const { data: currentProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', targetUserId)
      .single()

    if (profileErr || !currentProfile) {
      console.error('Profile lookup failed:', profileErr?.message || 'No profile found')
      return errorResponse('user_not_found', 404)
    }

    const oldUsername = currentProfile.username || ''

    // Step 6: Update username in profiles table
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ username: newUsername })
      .eq('id', targetUserId)

    if (updateErr) {
      console.error('Profile update failed:', updateErr.message)
      return errorResponse('unexpected', 500)
    }

    // Step 7: Write audit log
    const auditRestaurantId = restaurantId || targetRole.restaurant_id
    if (auditRestaurantId) {
      const { error: auditErr } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          restaurant_id: auditRestaurantId,
          user_id: callerId,
          entity_type: 'profile',
          entity_id: targetUserId,
          action: auditAction,
          details: {
            old_name: oldUsername,
            new_name: newUsername,
            updated_by: callerId,
            target_user_id: targetUserId,
          },
        })

      if (auditErr) {
        console.error('Audit log insert failed (non-fatal):', auditErr.message)
        // Non-fatal - continue with success
      }
    }

    console.log(`Username updated successfully: ${targetUserId} from "${oldUsername}" to "${newUsername}"`)
    return json({ success: true, old_username: oldUsername, new_username: newUsername }, 200)
  } catch (e) {
    console.error('update-display-name unexpected error:', e)
    return errorResponse('unexpected', 500)
  }
})
