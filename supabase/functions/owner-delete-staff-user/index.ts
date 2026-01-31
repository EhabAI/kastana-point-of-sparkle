// Backend function: owner-delete-staff-user
// Allows an owner to delete a staff auth user (cashier/kitchen) that belongs to their restaurant.
// This is mainly used to clean up orphaned accounts that block re-creation (e.g., email already exists).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorCode =
  | 'not_authorized'
  | 'missing_fields'
  | 'user_not_found'
  | 'not_your_staff'
  | 'unexpected'

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

async function findUserIdByEmail(
  // NOTE: use `any` to avoid edge-runtime typing mismatches across createClient generics.
  // This does not affect runtime behavior.
  serviceClient: any,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  // Supabase Admin API doesn't support direct get-by-email reliably; we page through users.
  // Keep a small safety cap to avoid infinite loops.
  const perPage = 1000
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('[owner-delete-staff-user] listUsers error:', error.message)
      return null
    }

    const users = data?.users ?? []
    const match = users.find((u: any) => (u.email || '').toLowerCase() === normalized)
    if (match?.id) return match.id

    // If we got fewer than perPage, there are no more pages.
    if (users.length < perPage) break
  }

  return null
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
      console.error('Missing required env vars for owner-delete-staff-user')
      return errorResponse('unexpected', 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return errorResponse('not_authorized', 401)
    }

    const body = (await req.json().catch(() => null)) as null | {
      email?: string
      restaurant_id?: string
    }

    const email = body?.email?.trim()
    const restaurantId = body?.restaurant_id

    if (!email || !restaurantId) {
      return errorResponse('missing_fields', 400)
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

    // Service-role client for admin operations
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Ensure caller is an owner (active)
    const { data: callerRole, error: roleErr } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'owner')
      .eq('is_active', true)
      .single()

    if (roleErr || !callerRole) {
      return errorResponse('not_authorized', 403)
    }

    // Verify owner owns this restaurant (restaurants.owner_id)
    const { data: ownerRestaurant, error: restErr } = await serviceClient
      .from('restaurants')
      .select('id')
      .eq('owner_id', callerId)
      .eq('id', restaurantId)
      .single()

    if (restErr || !ownerRestaurant) {
      return errorResponse('not_authorized', 403)
    }

    // Find target auth user by email
    const targetUserId = await findUserIdByEmail(serviceClient, email)
    if (!targetUserId) {
      return errorResponse('user_not_found', 404)
    }

    // Confirm the target auth user belongs to this restaurant via metadata (most reliable for orphan cleanup)
    const { data: targetUser, error: targetErr } = await serviceClient.auth.admin.getUserById(targetUserId)
    if (targetErr || !targetUser?.user) {
      return errorResponse('user_not_found', 404)
    }

    const meta = (targetUser.user.user_metadata || {}) as Record<string, unknown>
    const metaRestaurantId = typeof meta.restaurant_id === 'string' ? meta.restaurant_id : null
    const metaRole = typeof meta.role === 'string' ? meta.role : null

    if (metaRestaurantId !== restaurantId || (metaRole !== 'cashier' && metaRole !== 'kitchen')) {
      return errorResponse('not_your_staff', 403)
    }

    // Delete auth user (this is the important part to remove the email uniqueness block)
    const { error: deleteErr } = await serviceClient.auth.admin.deleteUser(targetUserId)
    if (deleteErr) {
      console.error('[owner-delete-staff-user] deleteUser failed:', deleteErr.message)
      return errorResponse('unexpected', 500)
    }

    // Best-effort cleanup in public tables (in case they exist)
    await serviceClient.from('user_roles').delete().eq('user_id', targetUserId)
    await serviceClient.from('profiles').delete().eq('id', targetUserId)

    return json({ success: true, user_id: targetUserId }, 200)
  } catch (e) {
    console.error('owner-delete-staff-user unexpected error', e)
    return errorResponse('unexpected', 500)
  }
})
