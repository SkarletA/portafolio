import { http, HttpResponse } from 'msw'
import { SUPABASE_URL } from './supabaseAuth'

// A PostgREST table intercepted with fixed fixture rows, ignoring the query
// string (select/eq/order/...). Good enough for Storybook: every hook that
// queries this table during a single story sees the same rows.
export function restHandler(table: string, rows: Record<string, unknown>[]) {
  return http.get(`${SUPABASE_URL}/rest/v1/${table}`, () => HttpResponse.json(rows))
}

// For a `.single()` query (e.g. getProfile), PostgREST returns the row itself
// rather than an array.
export function restSingleHandler(table: string, row: Record<string, unknown>) {
  return http.get(`${SUPABASE_URL}/rest/v1/${table}`, () => HttpResponse.json(row))
}

// A PostgREST RPC (POST /rest/v1/rpc/<fn>), ignoring the call's own
// arguments. `row` matches a `.single()`/`.maybeSingle()` caller - the row
// itself (or `null` for no match, e.g. get_household_partner with no
// partner yet) rather than an array.
export function rpcHandler(fn: string, row: Record<string, unknown> | null) {
  return http.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, () => HttpResponse.json(row))
}
