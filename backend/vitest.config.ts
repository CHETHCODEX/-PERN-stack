import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 45000,
    hookTimeout: 45000,
    fileParallelism: false,
  },
});
