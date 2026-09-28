// Deletes the calling user's own Finora account and all of their data.
//
// Runs with the secret key, which only ever lives here (server-side), never
// in the frontend. The user to delete is derived exclusively from the
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
  const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS')

  if (!supabaseUrl || !secretKeysRaw) {
    console.error('delete-account: SUPABASE_URL or SUPABASE_SECRET_KEYS is not set')
    return jsonResponse({ error: 'Server misconfiguration' }, 500)
  }

  // SUPABASE_SECRET_KEYS is a JSON dictionary auto-provisioned by the Edge
  // Functions runtime (replaces the old plain-string SUPABASE_SERVICE_ROLE_KEY),
  // keyed by key name - 'default' is the project's current secret key.
  let serviceRoleKey: string | undefined
  try {
    const secretKeys = JSON.parse(secretKeysRaw)
    serviceRoleKey = secretKeys?.default
  } catch (parseError) {
    console.error('delete-account: SUPABASE_SECRET_KEYS is not valid JSON', parseError)
    return jsonResponse({ error: 'Server misconfiguration' }, 500)
  }

  if (!serviceRoleKey) {
    console.error("delete-account: SUPABASE_SECRET_KEYS has no 'default' entry")
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
