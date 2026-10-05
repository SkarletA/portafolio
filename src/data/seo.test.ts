import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { siteUrl } from './seo'

// sitemap.xml and robots.txt are static files the Vite plugin never touches,
// so they are checked here to catch a stale domain after a domain change.
// Resolved from the project root (where `npm test` runs), since import.meta.url
// is not a file path under Vitest.
const readPublicFile = (name: string) =>
  readFileSync(resolve(process.cwd(), 'public', name), 'utf8')

describe('static SEO files', () => {
  it('sitemap.xml lists only URLs on the siteUrl origin', () => {
    const locs = [...readPublicFile('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    )

    expect(locs.length).toBeGreaterThan(0)
    for (const loc of locs) {
      expect(new URL(loc).origin).toBe(new URL(siteUrl).origin)
    }
  })

  it('robots.txt Sitemap line points to the siteUrl origin', () => {
    const sitemapLine = readPublicFile('robots.txt')
      .split('\n')
      .find((line) => line.startsWith('Sitemap:'))

    expect(sitemapLine).toBeDefined()
    const sitemapUrl = (sitemapLine ?? '').replace('Sitemap:', '').trim()
    expect(new URL(sitemapUrl).origin).toBe(new URL(siteUrl).origin)
  })
})
