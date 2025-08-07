import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./setup.js'],
    coverage: {
      include: [
        'src/libs/**/*.js'
      ]
    }
  }
});