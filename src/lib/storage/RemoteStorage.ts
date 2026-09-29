import type { Game, Member, MemberPatch, NewGame, NewMember } from '../types';
import { StorageError, type StorageAdapter } from './StorageAdapter';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
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
  return body as T;
}

/** Vercel Serverless Functions(/api/*) 를 통해 Upstash Redis 에 저장하는 구현 */
export class RemoteStorageAdapter implements StorageAdapter {
  readonly kind = 'remote' as const;

  /**
   * 앱을 열 때 멤버·대국을 한 번의 요청으로 받습니다.
   * 서버에 Redis 가 설정되지 않았거나 /api 자체가 없으면(정적 호스팅, vite 단독 실행) null 을 돌려줍니다.
   */
  async bootstrap(): Promise<{ members: Member[]; games: Game[] } | null> {
    let res: Response;
    try {
      res = await fetch('/api/bootstrap', { headers: { Accept: 'application/json' } });
    } catch {
      throw new StorageError('서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.');
    }
    if (res.status === 404) return null;
    const body = (await res.json().catch(() => null)) as { members?: unknown; games?: unknown; code?: unknown; error?: unknown } | null;
    if (res.status === 503 && body?.code === 'STORAGE_NOT_CONFIGURED') return null;
    if (!res.ok) {
      throw new StorageError(typeof body?.error === 'string' ? body.error : `요청에 실패했습니다. (${res.status})`, res.status);
    }
    // JSON 이 아니면(index.html 등) API 가 없는 환경
    if (!body || !Array.isArray(body.members) || !Array.isArray(body.games)) return null;
    return { members: body.members as Member[], games: body.games as Game[] };
  }

  listMembers(): Promise<Member[]> {
    return request<Member[]>('/api/members');
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

  listGames(): Promise<Game[]> {
    return request<Game[]>('/api/games');
  }

  addGame(input: NewGame): Promise<Game> {
    return request<Game>('/api/games', { method: 'POST', body: JSON.stringify(input) });
  }

  async deleteGame(id: string): Promise<void> {
    await request<unknown>(`/api/games/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}
