import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts'],
    pool: 'forks',
    setupFiles: ['./server/test/setup.ts']
  }
})
