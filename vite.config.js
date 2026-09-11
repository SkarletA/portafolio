import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { coverageConfigDefaults } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
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
