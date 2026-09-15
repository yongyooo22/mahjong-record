import { LocalStorageAdapter } from './LocalStorage';
import { probeRemote, RemoteStorageAdapter } from './RemoteStorage';
import type { StorageAdapter } from './StorageAdapter';

export type { StorageAdapter } from './StorageAdapter';
export { StorageError } from './StorageAdapter';
export { LocalStorageAdapter } from './LocalStorage';
export { RemoteStorageAdapter } from './RemoteStorage';

/**
 * 환경에 맞는 저장소를 고릅니다.
 * - VITE_STORAGE=local 이면 항상 localStorage
 * - 아니면 /api/health 를 확인해 Redis 가 설정된 경우 RemoteStorage, 아니면 localStorage 폴백
 */
export async function createStorage(): Promise<StorageAdapter> {
  const forced = import.meta.env.VITE_STORAGE as string | undefined;
  if (forced === 'local') return new LocalStorageAdapter();
  if (forced === 'remote') return new RemoteStorageAdapter();
  const remoteReady = await probeRemote();
  return remoteReady ? new RemoteStorageAdapter() : new LocalStorageAdapter();
}
