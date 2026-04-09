import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/platform/node/**/*.test.ts'],
    globals: false,
    environment: 'node',
  },
  esbuild: {
    target: 'node22',
    // Enable TypeScript decorator metadata for DI framework compatibility
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        target: 'ES2022',
        useDefineForClassFields: true,
      },
    },
  },
});
