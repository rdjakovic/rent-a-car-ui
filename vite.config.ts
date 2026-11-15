/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    globals: true,
    // Form dialogs with Radix selects take a few seconds when the whole suite runs in parallel
    testTimeout: 10000,
    // Node's fetch needs an absolute URL. This is jsdom's origin, which is what the MSW handlers' relative paths match.
    env: { VITE_API_BASE_URL: 'http://localhost:3000' },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.d.ts',
        'src/lib/mocks/**',
        'src/lib/api/schema.d.ts',
        'src/setupTests.ts',
        'src/main.tsx',
      ],
    },
  },
})
