import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteStorageAdapter } from './RemoteStorage';
import { StorageError } from './StorageAdapter';

function respond(status: number, body: string, contentType = 'application/json') {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status, headers: { 'Content-Type': contentType } })));
}

describe('RemoteStorageAdapter.bootstrap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('멤버·대국·후원을 한 번의 요청으로 받는다', async () => {
    respond(200, JSON.stringify({ members: [{ id: 'a' }], games: [], sponsors: [{ id: 's' }] }));
    await expect(new RemoteStorageAdapter().bootstrap()).resolves.toEqual({ members: [{ id: 'a' }], games: [], sponsors: [{ id: 's' }] });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/bootstrap');
  });

  it('후원이 없는 응답(예전 서버)은 빈 후원 목록으로 받는다', async () => {
    respond(200, JSON.stringify({ members: [{ id: 'a' }], games: [] }));
    await expect(new RemoteStorageAdapter().bootstrap()).resolves.toEqual({ members: [{ id: 'a' }], games: [], sponsors: [] });
  });

  it('Redis 미설정·API 없음이면 null (localStorage 폴백)', async () => {
    respond(503, JSON.stringify({ error: 'x', code: 'STORAGE_NOT_CONFIGURED' }));
    await expect(new RemoteStorageAdapter().bootstrap()).resolves.toBeNull();
    respond(404, '');
    await expect(new RemoteStorageAdapter().bootstrap()).resolves.toBeNull();
    respond(200, '<!doctype html><html></html>', 'text/html');
    await expect(new RemoteStorageAdapter().bootstrap()).resolves.toBeNull();
  });

  it('서버 오류나 네트워크 오류는 폴백하지 않고 오류로 알린다', async () => {
    respond(500, JSON.stringify({ error: '서버 오류가 발생했습니다.' }));
    await expect(new RemoteStorageAdapter().bootstrap()).rejects.toThrow('서버 오류가 발생했습니다.');
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(new RemoteStorageAdapter().bootstrap()).rejects.toBeInstanceOf(StorageError);
  });
});
