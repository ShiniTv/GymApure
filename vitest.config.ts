import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: false,
    setupFiles: ['tests/unit/setup.ts'],
    environmentMatchGlobs: [
      ['tests/unit/**/*.tsx', 'jsdom'],
    ],
  },
});
