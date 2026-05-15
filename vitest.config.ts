import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Vite plugin tests + codegen tests work on the filesystem, so a per-test
    // cwd is more reliable than the project root.
    isolate: true,
  },
})
