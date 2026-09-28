import { http, HttpResponse } from 'msw'
import { supabase } from '@services/supabaseClient'

// Matches the placeholder host .storybook/main.js forces VITE_SUPABASE_URL to
// - never a real Supabase project, so every handler below is scoped to it.
export const SUPABASE_URL = 'https://storybook.invalid'

export const MOCK_USER_ID = '00000000-0000-4000-8000-000000000001'

const MOCK_USER = {
  id: MOCK_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'demo@storybook.invalid',
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
}

function base64url(payload: object): string {
  return btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// An unsigned JWT shaped like a real one. Nothing ever verifies its signature
// - the handlers below intercept every request it's used on - it only needs a
// `sub`/`exp` payload supabase-js's own client-side decoding can read.
function createMockAccessToken(): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = { sub: MOCK_USER_ID, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 60 * 60 }
  return `${base64url(header)}.${base64url(payload)}.storybook-mock-signature`
}

// supabase.auth.getUser() always revalidates against the server (unlike
// getSession()), so every service function that calls it - directly or via a
// hook - hits this on every fetch. One handler covers all of them.
export const authHandlers = [http.get(`${SUPABASE_URL}/auth/v1/user`, () => HttpResponse.json(MOCK_USER))]

// A Storybook loader that signs the mock user in before the story renders.
// setSession() validates the access token by calling getUser() itself, which
// the handler above answers - that's what turns this synthetic token into a
// real in-memory session AuthContext and every hook below picks up.
export async function signInMockUser() {
  await supabase.auth.setSession({
    access_token: createMockAccessToken(),
    refresh_token: 'storybook-mock-refresh-token',
  })
}
