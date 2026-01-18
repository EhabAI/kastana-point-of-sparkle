// Supabase backend function: admin-create-user
// Creates an auth user + assigns role, callable by owner only for cashier/kitchen.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorCode = 'not_authorized' | 'user_exists' | 'weak_password' | 'invalid_role' | 'missing_restaurant' | 'kds_disabled' | 'unexpected'
type AppRole = 'system_admin' | 'owner' | 'cashier' | 'kitchen'

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

function isLikelyUserExists(message: string) {
  const m = message.toLowerCase()
  return (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists') ||
    m.includes('email exists') ||
    m.includes('email already') ||
    m.includes('duplicate')
  )
}

function isLikelyWeakPassword(message: string) {
  const m = message.toLowerCase()
  return m.includes('password') && (m.includes('at least') || m.includes('weak') || m.includes('6'))
}

function isValidRole(role: string): role is AppRole {
  return ['system_admin', 'owner', 'cashier', 'kitchen'].includes(role)
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
      console.error('Missing required env vars for admin-create-user')
      return errorResponse('unexpected', 'Unexpected error. Please try again.', 500)
    }

    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      console.error('Missing or invalid Authorization header')
      return errorResponse('not_authorized', 'Please sign in to perform this action.', 401)
    }

    const jwt = authHeader.replace(/^bearer\s+/i, '')

    // Parse request body
    const body = (await req.json().catch(() => null)) as null | {
      email?: string
      password?: string
      role?: string
      restaurant_id?: string
      branch_id?: string
      username?: string
    }
    const email = body?.email?.trim()
    const password = body?.password
    const requestedRole = body?.role || 'cashier'
    const restaurantId = body?.restaurant_id
    const branchId = body?.branch_id
    const username = body?.username?.trim()

    if (!email || !password) {
      return errorResponse('unexpected', 'Please provide an email and password.', 400)
    }

    // Validate the requested role
    if (!isValidRole(requestedRole)) {
      return errorResponse('invalid_role', 'Invalid role specified. Must be cashier or kitchen.', 400)
    }

    // Quick weak password check for clearer UX
    if (password.length < 6) {
      return errorResponse('weak_password', 'Password is too weak. Use at least 6 characters.', 400)
    }

    // Create service-role client for ALL privileged operations
    // This client bypasses RLS and can perform admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Step 1: Verify caller identity using JWT
    // Use getUser with the JWT to verify the caller's identity
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt)
    
    if (userErr || !userData?.user) {
      console.error('JWT verification failed:', userErr?.message || 'No user data')
      return errorResponse('not_authorized', 'Your session is invalid. Please sign in again.', 401)
    }

    const callerId = userData.user.id
    console.log(`Caller verified: ${callerId}`)

    // Step 2: Check caller's role using the service client (bypasses RLS)
    // Only owners can create cashier/kitchen staff
    const { data: callerRole, error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .select('role, restaurant_id')
      .eq('user_id', callerId)
      .eq('is_active', true)
      .single()

    if (roleErr || !callerRole) {
      console.error('Role lookup failed:', roleErr?.message || 'No role found')
      return errorResponse('not_authorized', 'Unable to verify your permissions.', 403)
    }

    console.log(`Caller role: ${callerRole.role}`)

    // Step 3: Enforce authorization rules
    // Only owners can use this function to create cashier/kitchen
    if (callerRole.role !== 'owner') {
      console.error(`Unauthorized role: ${callerRole.role}`)
      return errorResponse('not_authorized', 'Only restaurant owners can create staff accounts.', 403)
    }

    // Owners can only create cashier or kitchen staff
    if (requestedRole !== 'cashier' && requestedRole !== 'kitchen') {
      return errorResponse('not_authorized', 'Owners can only create cashier or kitchen staff accounts.', 403)
    }

    // Restaurant ID is required for staff creation
    if (!restaurantId) {
      return errorResponse('missing_restaurant', 'Restaurant ID is required when creating staff.', 400)
    }

    // Verify the owner owns this restaurant
    if (callerRole.restaurant_id !== restaurantId) {
      console.error(`Restaurant mismatch: owner has ${callerRole.restaurant_id}, requested ${restaurantId}`)
      return errorResponse('not_authorized', 'You can only create staff for your own restaurant.', 403)
    }

    // For kitchen role, verify KDS is enabled
    if (requestedRole === 'kitchen') {
      const { data: kdsSettings, error: kdsErr } = await supabaseAdmin
        .from('restaurant_settings')
        .select('kds_enabled')
        .eq('restaurant_id', restaurantId)
        .maybeSingle()

      if (kdsErr) {
        console.error('KDS settings lookup failed:', kdsErr.message)
        return errorResponse('unexpected', 'Unable to verify KDS settings.', 500)
      }

      if (!kdsSettings?.kds_enabled) {
        return errorResponse('kds_disabled', 'KDS must be enabled to create kitchen staff.', 400)
      }
    }

    // Step 4: Create the user using admin API (service role)
    console.log(`Creating user: ${email} with role: ${requestedRole}`)
    
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: requestedRole,
        restaurant_id: restaurantId,
        branch_id: branchId || null,
      },
    })

    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Failed to create user.'
      const authCode = (createErr as unknown as { code?: string })?.code

      console.error('Create user failed:', msg, 'Code:', authCode)

      if (authCode === 'email_exists' || isLikelyUserExists(msg)) {
        return errorResponse('user_exists', 'This email is already registered.', 409)
      }

      if (isLikelyWeakPassword(msg)) {
        return errorResponse('weak_password', 'Password is too weak. Use at least 6 characters.', 400)
      }

      return errorResponse('unexpected', 'Unexpected error while creating the user. Please try again.', 500)
    }

    const newUserId = created.user.id
    console.log(`User created: ${newUserId}`)

    // Step 5: Insert role record
    const roleInsertData: { user_id: string; role: AppRole; restaurant_id: string; branch_id?: string } = {
      user_id: newUserId,
      role: requestedRole as AppRole,
      restaurant_id: restaurantId,
    }

    if (branchId) {
      roleInsertData.branch_id = branchId
    }

    const { error: roleInsertErr } = await supabaseAdmin
      .from('user_roles')
      .insert(roleInsertData)

    if (roleInsertErr) {
      console.error('Role insert failed:', roleInsertErr.message)
      // Attempt to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch((e) => {
        console.error('Failed to cleanup user after role insert failure:', e)
      })
      return errorResponse('unexpected', `User created, but assigning the ${requestedRole} role failed. Please try again.`, 500)
    }

    // Step 6: Insert profile record (trigger should also create it, but this ensures it exists)
    const { error: profileInsertErr } = await supabaseAdmin
      .from('profiles')
      .insert({ id: newUserId, email, username: username || email })

    if (profileInsertErr) {
      console.error('Profile insert failed (non-fatal):', profileInsertErr.message)
      // Non-fatal - trigger should have created it, try to update username if exists
      if (username) {
        const { error: updateErr } = await supabaseAdmin
          .from('profiles')
          .update({ username })
          .eq('id', newUserId)
        if (updateErr) {
          console.error('Profile update failed:', updateErr.message)
        }
      }
    }

    console.log(`User created successfully: ${newUserId} with role ${requestedRole}`)
    return json({ user_id: newUserId }, 200)
  } catch (e) {
    console.error('admin-create-user unexpected error:', e)
    return errorResponse('unexpected', 'Unexpected error. Please try again.', 500)
  }
})
