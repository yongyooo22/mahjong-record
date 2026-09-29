import type { Game, Member } from '../types';
import { LocalStorageAdapter } from './LocalStorage';
import { RemoteStorageAdapter } from './RemoteStorage';
import { StorageError, type StorageAdapter } from './StorageAdapter';

export type { StorageAdapter } from './StorageAdapter';
export { StorageError } from './StorageAdapter';
export { LocalStorageAdapter } from './LocalStorage';
export { RemoteStorageAdapter } from './RemoteStorage';

export interface OpenedStorage {
  storage: StorageAdapter;
  members: Member[];
  games: Game[];
}

/**
 * 환경에 맞는 저장소를 고르고 첫 데이터를 함께 읽습니다.
 * - VITE_STORAGE=local 이면 항상 localStorage
 * - 아니면 /api/bootstrap 한 번으로 멤버·대국을 받고, 서버에 Redis 가 없거나 API 가 없으면 localStorage 폴백
 */
export async function openStorage(): Promise<OpenedStorage> {
  const forced = import.meta.env.VITE_STORAGE as string | undefined;
  if (forced !== 'local') {
    const remote = new RemoteStorageAdapter();
    const data = await remote.bootstrap();
    if (data) return { storage: remote, ...data };
    if (forced === 'remote') throw new StorageError('Redis 저장소가 설정되지 않았습니다.');
  }
  const local = new LocalStorageAdapter();
  const [members, games] = await Promise.all([local.listMembers(), local.listGames()]);
  return { storage: local, members, games };
}
