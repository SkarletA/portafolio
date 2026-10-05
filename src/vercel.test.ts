import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Finora routes (/finora, /finora/login, ...) only exist on the client. Without this
// fallback, a direct load or refresh on any path other than / returns Vercel's 404,
// which also breaks the Supabase email links. Checked here so the rewrite cannot be
// removed without a test failing. Resolved from the project root (where `npm test`
// runs), since import.meta.url is not a file path under Vitest.
const vercelConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
  rewrites?: { source: string; destination: string }[]
}

describe('vercel.json', () => {
  it('rewrites unmatched paths to index.html for client-side routing', () => {
    const fallback = vercelConfig.rewrites?.find((rule) => rule.destination === '/index.html')

    expect(fallback).toBeDefined()
    expect(new RegExp(`^${fallback?.source ?? ''}$`).test('/finora/reset-password')).toBe(true)
  })
})
