import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/index.ts',
        'src/main.ts',
        'src/config/typeorm.config.ts',
        'test/**',
        '**/*.d.ts',
        '**/migrations/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      },
      all: true,
      clean: true,
      cleanOnRerun: true
    },
  },
  plugins: [
    // This is required to build the test files with SWC
    swc.vite({
      // Nest requires this
      jsc: {
        target: 'es2021',
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
          legacyDecorator: true,
        },
      },
    }),
  ],
}); 
