// Supabase backend function: admin-create-user
// Creates an auth user + assigns owner role, only callable by system_admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ErrorCode = 'not_authorized' | 'user_exists' | 'weak_password' | 'unexpected'

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
    m.includes('user already exists') ||
    m.includes('duplicate') ||
    m.includes('email already')
  )
}

function isLikelyWeakPassword(message: string) {
  const m = message.toLowerCase()
  return m.includes('password') && (m.includes('at least') || m.includes('weak') || m.includes('6'))
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
      return errorResponse('not_authorized', 'Please sign in as a system admin to perform this action.', 401)
    }

    const body = (await req.json().catch(() => null)) as null | { email?: string; password?: string }
    const email = body?.email?.trim()
    const password = body?.password

    if (!email || !password) {
      return errorResponse('unexpected', 'Please provide an email and password.', 400)
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

    const { data: isAdmin, error: roleErr } = await userClient.rpc('has_role', {
      _user_id: callerId,
      _role: 'system_admin',
    })

    if (roleErr) {
      console.error('Role check failed', roleErr)
      return errorResponse('not_authorized', 'Unable to verify your permissions. Please try again.', 403)
    }

    if (!isAdmin) {
      return errorResponse('not_authorized', 'Not authorized. Only system admins can create owners.', 403)
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

      if (isLikelyUserExists(msg)) {
        return errorResponse('user_exists', 'This email is already registered.', 409)
      }

      if (isLikelyWeakPassword(msg)) {
        return errorResponse('weak_password', 'Password is too weak. Use at least 6 characters.', 400)
      }

      console.error('Create user failed', createErr)
      return errorResponse('unexpected', 'Unexpected error while creating the user. Please try again.', 500)
    }

    const newUserId = created.user.id

    const { error: roleInsertErr } = await serviceClient
      .from('user_roles')
      .insert({ user_id: newUserId, role: 'owner' })

    if (roleInsertErr) {
      console.error('Role insert failed', roleInsertErr)
      return errorResponse('unexpected', 'User created, but assigning the owner role failed. Please try again.', 500)
    }

    return json({ user_id: newUserId }, 200)
  } catch (e) {
    console.error('admin-create-user unexpected error', e)
    return errorResponse('unexpected', 'Unexpected error. Please try again.', 500)
  }
})
