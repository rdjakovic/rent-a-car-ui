import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    css: true,
    globals: true,
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html", "json-summary"],
      reportsDirectory: "./coverage",
      exclude: [
        // Test utilities
        "src/lib/mocks/**",
        "src/lib/test-cleanup.ts",
        "src/lib/test-utils.tsx",
        "src/lib/test-scenarios.ts",
        "src/lib/test-factories.ts",
        "src/lib/query/config.ts",

        // Test files
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",

        // Type definitions
        "**/*.d.ts",

        // Configuration files
        "vite.config.ts",
        "vitest.*.ts",

        // Root files
        "eslint.config.js",
        "tailwind.config.js",
        "postcss.config.js",

        // Generated files
        "src/lib/api/schema.d.ts",

        // Node modules and build artifacts
        "node_modules/",
        "dist/",
        "build/",
        "coverage/",

        // Ignore files
        ".git/",
        ".github/",

        // Assets
        "**/*.css",
        "**/*.scss",
        "**/*.svg",
        "**/*.png",
        "**/*.jpg",
        "**/*.jpeg",

        // Some folders
        "src/assets/**",
        "src/styles/**",
        "scripts/**",
      ],
    },
  },
});
