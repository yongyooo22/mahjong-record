import { defineConfig } from 'vitest/config';
import { avatarFilesPlugin } from './vite.avatarFiles';

export default defineConfig({
  plugins: [avatarFilesPlugin()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
  },
});
