import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { coverageConfigDefaults } from 'vitest/config'
import { portfolioSeo } from './src/data/seo.ts'

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Fills the %seo.<key>% placeholders in index.html from src/data/seo.ts. An unknown
// key fails the build instead of shipping a literal placeholder to crawlers.
const seoHtmlPlugin = {
  name: 'seo-html',
  transformIndexHtml(html) {
    return html.replace(/%seo\.(\w+)%/g, (_, key) => {
      if (!(key in portfolioSeo)) throw new Error(`Unknown SEO placeholder: %seo.${key}%`)
      return escapeHtml(portfolioSeo[key])
    })
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), seoHtmlPlugin],
  resolve: {
    // Finora-only aliases - pages/ and routes/ deliberately keep relative
    // imports (see src/apps/finora/../../CLAUDE.md). Shared by both `vite
    // build`/`vite dev` and the `test` block below, since Vitest reads this
    // same resolved config.
    alias: {
      '@hooks': fileURLToPath(new URL('./src/apps/finora/hooks', import.meta.url)),
      '@domain': fileURLToPath(new URL('./src/apps/finora/domain', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/apps/finora/components', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/apps/finora/services', import.meta.url)),
      '@context': fileURLToPath(new URL('./src/apps/finora/context', import.meta.url)),
      // More specific than @components - used for imports that reach directly
      // into one of the three Atomic Design tiers instead of a bare
      // components/ file (only ProtectedRoute.tsx today, which still goes
      // through @components).
      '@atoms': fileURLToPath(new URL('./src/apps/finora/components/atoms', import.meta.url)),
      '@molecules': fileURLToPath(new URL('./src/apps/finora/components/molecules', import.meta.url)),
      '@organisms': fileURLToPath(new URL('./src/apps/finora/components/organisms', import.meta.url)),
      // Portfolio-side aliases - prefixed to avoid colliding with Finora's
      // own @components above (same key, different target isn't possible).
      '@portfolio-components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@portfolio-sections': fileURLToPath(new URL('./src/sections', import.meta.url)),
      '@portfolio-data': fileURLToPath(new URL('./src/data', import.meta.url)),
      // MSW fixtures/handlers shared across page stories - keeps
      // Page.stories.tsx imports stable regardless of how deep the page
      // component lives, instead of a `../../../../.storybook/mocks/...` that
      // breaks the moment a story moves.
      '@storybook-mocks': fileURLToPath(new URL('./.storybook/mocks', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    // Reuses one jsdom environment per worker instead of recreating it per
    // test file - Vitest's own suggestion when it detects heavy environment
    // setup cost. Reduces the resource contention that caused intermittent
    // render() timeouts on CPU-constrained runners (2-core CI runners).
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      // text: human-readable summary in the CI log. lcov: standard format for
      // external tooling. json-summary/json: required by the
      // davelosert/vitest-coverage-report-action PR comment step in CI.
      reporter: ['text', 'lcov', 'json-summary', 'json'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/*.stories.tsx',
        'src/main.tsx',
        'src/assets/html/**',
      ],
    },
  },
})
