import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const VIRTUAL_ID = 'virtual:avatar-files';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * `virtual:avatar-files` 모듈: public/images/avatars/ 안의 PNG 파일명 배열.
 * 이미지를 저장소에 추가하기만 하면 멤버 화면의 캐릭터 선택 목록에 자동으로 나타납니다.
 * (public/ 의 파일을 import 하면 Vite 가 assets/ 로 한 번 더 복사하므로, 파일명만 읽어 URL 은 /images/avatars/ 로 씁니다.)
 */
// 반환 타입을 Vite 의 Plugin 으로 고정하지 않는 이유: vitest 가 내부적으로 다른 vite 버전을 쓰므로 두 설정 파일에서 모두 받아들이도록 합니다.
export function avatarFilesPlugin(dir = resolve(process.cwd(), 'public/images/avatars')) {
  return {
    name: 'mahjong:avatar-files',
    resolveId(id: string) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id: string) {
      if (id !== RESOLVED_ID) return null;
      let files: string[] = [];
      try {
        files = readdirSync(dir)
          .filter((f) => /\.png$/i.test(f))
          .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
      } catch {
        files = [];
      }
      return `export default ${JSON.stringify(files)};`;
    },
    configureServer(server: {
      watcher: { add(path: string): unknown; on(event: 'add' | 'unlink', cb: (path: string) => void): unknown };
      moduleGraph: { getModuleById(id: string): unknown; invalidateModule(mod: never): void };
      ws: { send(payload: { type: 'full-reload' }): void };
    }) {
      // 개발 중 이미지가 추가·삭제되면 모듈을 다시 읽도록
      server.watcher.add(dir);
      const invalidate = (path: string) => {
        if (!path.startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod as never);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', invalidate);
      server.watcher.on('unlink', invalidate);
    },
  };
}
