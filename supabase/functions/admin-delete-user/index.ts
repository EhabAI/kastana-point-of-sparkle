// Supabase backend function: admin-delete-user
// Deletes an auth user, callable by system_admin OR with special internal key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-key',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: { code: 'config_error' } }, 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Check for system_admin auth
    const authHeader = req.headers.get('Authorization')
    
    let isAuthorized = false
    
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const jwt = authHeader.replace(/^bearer\s+/i, '')
      const { data: userData } = await supabaseAdmin.auth.getUser(jwt)
      
      if (userData?.user) {
        const { data: callerRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .single()
        
        if (callerRole?.role === 'system_admin') {
          isAuthorized = true
        }
      }
    }

    if (!isAuthorized) {
      return json({ error: { code: 'not_authorized' } }, 403)
    }

    // Get user_id to delete
    const body = await req.json().catch(() => null)
    const userId = body?.user_id

    if (!userId) {
      return json({ error: { code: 'missing_user_id' } }, 400)
    }

    // Delete user from auth
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteErr) {
      console.error('Delete user failed:', deleteErr.message)
      return json({ error: { code: 'delete_failed', message: deleteErr.message } }, 500)
    }

    console.log(`User deleted: ${userId}`)
    return json({ success: true, user_id: userId })
  } catch (e) {
    console.error('admin-delete-user error:', e)
    return json({ error: { code: 'unexpected' } }, 500)
  }
})
