import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      exclude: [
        // Mock data and handlers (if you want to exclude them from coverage)
        'src/lib/mocks/data.ts',
        'src/lib/mocks/handlers.ts',
        
        // Test files
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        
        // Type definitions
        '**/*.d.ts',
        
        // Configuration files
        'vite.config.ts',
        'vitest.*.ts',
        
        // Generated files
        'src/lib/api/schema.d.ts',
        
        // Node modules and build artifacts
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        
        // Ignore files
        '.git/',
        '.github/',
        
        // Assets
        '**/*.css',
        '**/*.scss',
        '**/*.svg',
        '**/*.png',
        '**/*.jpg',
        '**/*.jpeg'
      ]
    }
  }
})