import type { Game, Member } from '../types';
import { LocalStorageAdapter } from './LocalStorage';
import { isRemoteUnavailable, RemoteStorageAdapter } from './RemoteStorage';
import type { StorageAdapter } from './StorageAdapter';

export type { StorageAdapter } from './StorageAdapter';

export interface Bootstrapped {
  storage: StorageAdapter;
  members: Member[];
  games: Game[];
}

/**
 * 환경에 맞는 저장소를 고르면서 첫 데이터까지 한 번에 읽습니다.
 * - VITE_STORAGE=local 이면 항상 localStorage
 * - 아니면 /api/bootstrap 을 바로 호출하고, 서버 저장소가 없는 응답(404·503)일 때만 localStorage 폴백
 *   (예전처럼 /api/health 로 먼저 확인하지 않아 첫 화면까지 서버 왕복이 한 번으로 줄어듭니다)
 */
export async function bootstrapStorage(): Promise<Bootstrapped> {
  const forced = import.meta.env.VITE_STORAGE as string | undefined;
  if (forced !== 'local') {
    const remote = new RemoteStorageAdapter();
    try {
      return { storage: remote, ...(await remote.load()) };
    } catch (err) {
      if (forced === 'remote' || !isRemoteUnavailable(err)) throw err;
    }
  }
  const local = new LocalStorageAdapter();
  return { storage: local, ...(await local.load()) };
}
