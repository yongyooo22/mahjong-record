# 작업 규칙

- 작업을 마치면 PR을 만들고 main 에 머지까지 합니다 (squash 머지, Vercel 미리보기 빌드가 성공한 뒤).
- 머지 전에 `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npm run build` 를 통과시킵니다.
