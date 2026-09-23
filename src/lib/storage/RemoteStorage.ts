import type { Game, Member, MemberPatch, NewGame, NewMember } from '../types';
import { StorageError, type Snapshot, type StorageAdapter } from './StorageAdapter';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      // Accept 를 명시해야 vite 단독 실행(API 없음)에서 index.html 대신 404 를 받아 localStorage 폴백을 탈 수 있습니다.
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new StorageError('서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.');
  }
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `요청에 실패했습니다. (${res.status})`;
    throw new StorageError(message, res.status);
  }
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    // 200 인데 JSON 이 아니면 SPA 리라이트로 index.html 이 온 것 = 이 환경에 /api 가 없음 (vite 단독 실행) → 404 로 취급
    throw new StorageError('서버 API 가 없습니다.', 404);
  }
  return body as T;
}

/** Vercel Serverless Functions(/api/*) 를 통해 Upstash Redis 에 저장하는 구현 */
export class RemoteStorageAdapter implements StorageAdapter {
  readonly kind = 'remote' as const;

  load(): Promise<Snapshot> {
    return request<Snapshot>('/api/bootstrap');
  }

  addMember(input: NewMember): Promise<Member> {
    return request<Member>('/api/members', { method: 'POST', body: JSON.stringify(input) });
  }

  updateMember(id: string, patch: MemberPatch): Promise<Member> {
    return request<Member>(`/api/members/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  }

  addGame(input: NewGame): Promise<Game> {
    return request<Game>('/api/games', { method: 'POST', body: JSON.stringify(input) });
  }

  async deleteGame(id: string): Promise<void> {
    await request<unknown>(`/api/games/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}

/**
 * 서버 저장소를 쓸 수 없는 상황인지 (→ localStorage 폴백).
 * 404: /api 자체가 없음 (vite 단독 실행), 503: Redis 환경 변수 미설정.
 * 그 밖의 오류(네트워크 끊김 등)는 폴백하지 않고 화면에 알려 다시 시도하게 합니다.
 */
export function isRemoteUnavailable(err: unknown): boolean {
  return err instanceof StorageError && (err.status === 404 || err.status === 503);
}
