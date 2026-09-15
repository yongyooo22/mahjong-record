import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 개발 시 API 까지 함께 띄우려면 `vercel dev` 를 사용하세요 (npm run dev:vercel).
 * `vite` 단독 실행 시 /api 가 없으므로 앱은 자동으로 localStorage 폴백으로 동작합니다.
 * 별도 API 서버로 프록시하려면 VITE_API_PROXY=http://localhost:3001 처럼 지정할 수 있습니다.
 */
export default defineConfig(({ mode }) => {
  const proxyTarget = process.env.VITE_API_PROXY;
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: proxyTarget && mode !== 'production' ? { '/api': { target: proxyTarget, changeOrigin: true } } : undefined,
    },
  };
});
