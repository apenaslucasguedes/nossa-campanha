import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export const VITEST_INCLUDE = [
  'src/**/*.test.{ts,tsx}',
  'src/**/*.spec.{ts,tsx}',
  'supabase/**/*.test.ts',
] as const

export default defineConfig({
  base: './',
  plugins: [react()],
  test: { include: [...VITEST_INCLUDE] },
})
