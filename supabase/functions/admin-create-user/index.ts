// Supabase backend function: admin-create-user
// Creates an auth user + assigns role, callable by system_admin or owner.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorCode = 'not_authorized' | 'user_exists' | 'weak_password' | 'invalid_role' | 'missing_restaurant' | 'unexpected'
type AppRole = 'system_admin' | 'owner' | 'cashier'

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
  return ['system_admin', 'owner', 'cashier'].includes(role)
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
      console.error('Missing required env vars for admin-create-user')
      return errorResponse('unexpected', 'Unexpected error. Please try again.', 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return errorResponse('not_authorized', 'Please sign in to perform this action.', 401)
    }

    const body = (await req.json().catch(() => null)) as null | {
      email?: string
      password?: string
      role?: string
      restaurant_id?: string
    }
    const email = body?.email?.trim()
    const password = body?.password
    const requestedRole = body?.role || 'cashier'
    const restaurantId = body?.restaurant_id

    if (!email || !password) {
      return errorResponse('unexpected', 'Please provide an email and password.', 400)
    }

    // Validate the requested role
    if (!isValidRole(requestedRole)) {
      return errorResponse('invalid_role', 'Invalid role specified. Must be owner or cashier.', 400)
    }

    // Quick weak password check for clearer UX
    if (password.length < 6) {
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

    // Check if caller is system_admin
    const { data: isSystemAdmin, error: sysAdminErr } = await userClient.rpc('has_role', {
      _user_id: callerId,
      _role: 'system_admin',
    })

    if (sysAdminErr) {
      console.error('System admin role check failed', sysAdminErr)
      return errorResponse('not_authorized', 'Unable to verify your permissions. Please try again.', 403)
    }

    // Check if caller is owner
    const { data: isOwner, error: ownerErr } = await userClient.rpc('has_role', {
      _user_id: callerId,
      _role: 'owner',
    })

    if (ownerErr) {
      console.error('Owner role check failed', ownerErr)
      return errorResponse('not_authorized', 'Unable to verify your permissions. Please try again.', 403)
    }

    // Must be either system_admin or owner
    if (!isSystemAdmin && !isOwner) {
      return errorResponse('not_authorized', 'Not authorized. Only system admins and owners can create users.', 403)
    }

    // Owners can only create cashiers for their restaurant
    if (isOwner && !isSystemAdmin) {
      if (requestedRole !== 'cashier') {
        return errorResponse('not_authorized', 'Owners can only create cashier accounts.', 403)
      }
      if (!restaurantId) {
        return errorResponse('missing_restaurant', 'Restaurant ID is required when creating a cashier.', 400)
      }
      // Verify the owner owns this restaurant
      const { data: ownerRestaurantId, error: restErr } = await userClient.rpc('get_owner_restaurant_id', {
        _user_id: callerId,
      })
      if (restErr || ownerRestaurantId !== restaurantId) {
        return errorResponse('not_authorized', 'You can only create cashiers for your own restaurant.', 403)
      }
    }

    // System admins creating owners don't need restaurant_id
    // System admins creating cashiers need restaurant_id
    if (isSystemAdmin && requestedRole === 'cashier' && !restaurantId) {
      return errorResponse('missing_restaurant', 'Restaurant ID is required when creating a cashier.', 400)
    }

    // Service-role client to create users + bypass RLS safely
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Failed to create user.'
      const authCode = (createErr as unknown as { code?: string })?.code

      if (authCode === 'email_exists' || isLikelyUserExists(msg)) {
        return errorResponse('user_exists', 'This email is already registered.', 409)
      }

      if (isLikelyWeakPassword(msg)) {
        return errorResponse('weak_password', 'Password is too weak. Use at least 6 characters.', 400)
      }

      console.error('Create user failed', createErr)
      return errorResponse('unexpected', 'Unexpected error while creating the user. Please try again.', 500)
    }

    const newUserId = created.user.id

    // Insert role with restaurant_id if applicable
    const roleInsertData: { user_id: string; role: AppRole; restaurant_id?: string } = {
      user_id: newUserId,
      role: requestedRole as AppRole,
    }
    
    // Add restaurant_id for cashiers and optionally for owners if provided
    if (restaurantId) {
      roleInsertData.restaurant_id = restaurantId
    }

    const { error: roleInsertErr } = await serviceClient
      .from('user_roles')
      .insert(roleInsertData)

    if (roleInsertErr) {
      console.error('Role insert failed', roleInsertErr)
      return errorResponse('unexpected', `User created, but assigning the ${requestedRole} role failed. Please try again.`, 500)
    }

    // Insert profile record (trigger should also create it, but this ensures it exists)
    const { error: profileInsertErr } = await serviceClient
      .from('profiles')
      .insert({ id: newUserId, email })

    if (profileInsertErr) {
      console.error('Profile insert failed (non-fatal)', profileInsertErr)
      // Non-fatal - trigger should have created it
    }

    console.log(`User created successfully: ${newUserId} with role ${requestedRole}`)
    return json({ user_id: newUserId }, 200)
  } catch (e) {
    console.error('admin-create-user unexpected error', e)
    return errorResponse('unexpected', 'Unexpected error. Please try again.', 500)
  }
})
