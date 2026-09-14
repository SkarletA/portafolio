// Deletes the calling user's own Finora account and all of their data.
//
// Runs with the service_role key, which only ever lives here (server-side),
// never in the frontend. The user to delete is derived exclusively from the
// caller's own verified JWT - no id is accepted in the request body - so
// there's nothing a client could tamper with to delete a different account.
//
// Deleting the auth user cascades to transactions, budgets, goals, and
// transaction_payments via the ON DELETE CASCADE foreign keys already added
// in the corresponding migration.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const token = authHeader.replace('Bearer ', '')
  const { data: userData, error: userError } = await adminClient.auth.getUser(token)

  if (userError || !userData.user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401)
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id)

  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500)
  }

  return jsonResponse({ success: true }, 200)
})
