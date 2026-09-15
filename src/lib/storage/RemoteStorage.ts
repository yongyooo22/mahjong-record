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

/** 서버 API 가 Redis 와 연결되어 있는지 확인 */
export async function probeRemote(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { headers: { Accept: 'application/json' } });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean; storage?: string };
    return body.ok === true && body.storage === 'redis';
  } catch {
    return false;
  }
}
