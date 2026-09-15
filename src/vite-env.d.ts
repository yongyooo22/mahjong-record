/// <reference types="vite/client" />

declare module 'virtual:avatar-files' {
  /** public/images/avatars/ 안의 PNG 파일명 (빌드 시 vite.avatarFiles.ts 가 생성) */
  const files: string[];
  export default files;
}
