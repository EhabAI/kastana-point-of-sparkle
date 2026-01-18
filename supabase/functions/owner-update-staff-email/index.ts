// Supabase backend function: owner-update-staff-email
// Allows owner to update their staff's (cashier/kitchen) email

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorCode = 'not_authorized' | 'invalid_email' | 'user_not_found' | 'email_taken' | 'not_your_staff' | 'unexpected'

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
      console.error('Missing required env vars for owner-update-staff-email')
      return errorResponse('unexpected', 'Unexpected error. Please try again.', 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return errorResponse('not_authorized', 'Please sign in to perform this action.', 401)
    }

    const body = (await req.json().catch(() => null)) as null | {
      user_id?: string
      new_email?: string
      restaurant_id?: string
    }
    
    const targetUserId = body?.user_id
    const newEmail = body?.new_email
    const restaurantId = body?.restaurant_id

    if (!targetUserId || !newEmail || !restaurantId) {
      return errorResponse('unexpected', 'Please provide user_id, new_email, and restaurant_id.', 400)
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return errorResponse('invalid_email', 'Please enter a valid email address.', 400)
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

    // Service-role client for admin operations
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Check if caller is owner of the restaurant
    const { data: callerRole, error: roleErr } = await serviceClient
      .from('user_roles')
      .select('role, restaurant_id')
      .eq('user_id', callerId)
      .eq('role', 'owner')
      .single()

    if (roleErr || !callerRole) {
      return errorResponse('not_authorized', 'Only restaurant owners can update staff emails.', 403)
    }

    // Get owner's restaurant
    const { data: ownerRestaurant, error: restErr } = await serviceClient
      .from('restaurants')
      .select('id')
      .eq('owner_id', callerId)
      .single()

    if (restErr || !ownerRestaurant || ownerRestaurant.id !== restaurantId) {
      return errorResponse('not_authorized', 'You can only update staff for your own restaurant.', 403)
    }

    // Check if target user is staff (cashier or kitchen) of this restaurant
    const { data: targetRole, error: targetRoleErr } = await serviceClient
      .from('user_roles')
      .select('role, restaurant_id')
      .eq('user_id', targetUserId)
      .eq('restaurant_id', restaurantId)
      .in('role', ['cashier', 'kitchen'])
      .single()

    if (targetRoleErr || !targetRole) {
      return errorResponse('not_your_staff', 'This user is not a staff member of your restaurant.', 403)
    }

    // Verify the target user exists
    const { data: targetUser, error: targetErr } = await serviceClient.auth.admin.getUserById(targetUserId)

    if (targetErr || !targetUser?.user) {
      return errorResponse('user_not_found', 'User not found.', 404)
    }

    // Update the email (skip email confirmation for admin updates)
    const { error: updateErr } = await serviceClient.auth.admin.updateUserById(
      targetUserId,
      { email: newEmail, email_confirm: true }
    )

    if (updateErr) {
      console.error('Email update failed', updateErr)
      if (updateErr.message?.includes('already registered') || updateErr.message?.includes('duplicate')) {
        return errorResponse('email_taken', 'This email is already registered.', 400)
      }
      return errorResponse('unexpected', 'Failed to update email. Please try again.', 500)
    }

    // Update the profiles table as well
    const { error: profileErr } = await serviceClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', targetUserId)

    if (profileErr) {
      console.error('Profile email update failed (non-fatal)', profileErr)
    }

    console.log(`Email updated successfully for user: ${targetUserId} by owner: ${callerId}`)
    return json({ success: true }, 200)
  } catch (e) {
    console.error('owner-update-staff-email unexpected error', e)
    return errorResponse('unexpected', 'Unexpected error. Please try again.', 500)
  }
})
