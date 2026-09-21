import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { coverageConfigDefaults } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
        'src/main.jsx',
        'src/assets/html/**',
      ],
    },
  },
})
