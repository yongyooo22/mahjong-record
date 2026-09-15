import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../../src/config/rules';
import { gameByIdHandler, gamesHandler, memberByIdHandler, membersHandler } from './handlers';
import { MemoryStore } from './store';

function mockReq(method: string, opts: { body?: unknown; query?: Record<string, string> } = {}) {
  return { method, body: opts.body, query: opts.query ?? {}, headers: {} } as unknown as VercelRequest;
}

function mockRes() {
  const out: { status: number; body: unknown; headers: Record<string, string> } = {
    status: 0,
    body: null,
    headers: {},
  };
  const res = {
    setHeader: (k: string, v: string) => {
      out.headers[k] = v;
    },
    status: (code: number) => {
      out.status = code;
      return res;
    },
    json: (body: unknown) => {
      out.body = body;
      return res;
    },
  };
  return { res: res as unknown as VercelResponse, out };
}

const validGame = {
  playedAt: '2025-03-08T10:30:00.000Z',
  title: '저녁 한판',
  playerCount: 4,
  gameType: 'hanchan',
  playerIds: ['yeonkyung', 'minsu', 'jisu', 'hyunwoo'],
  scores: [38200, 27600, 21400, 12800],
  memo: '화려한 주말 마작!',
  rules: DEFAULT_RULES,
};

describe('API 핸들러', () => {
  it('Redis 미설정이면 503', async () => {
    const { res, out } = mockRes();
    await membersHandler(() => null)(mockReq('GET'), res);
    expect(out.status).toBe(503);
  });

  it('GET /api/members 는 첫 호출에 샘플 멤버를 시드한다', async () => {
    const store = new MemoryStore();
    const { res, out } = mockRes();
    await membersHandler(() => store)(mockReq('GET'), res);
    expect(out.status).toBe(200);
    expect((out.body as { name: string }[]).map((m) => m.name)).toEqual(['연경', '민수', '지수', '현우']);
    expect(store.members?.length).toBe(4);
  });

  it('POST /api/members, PUT /api/members/:id', async () => {
    const store = new MemoryStore();
    const h = membersHandler(() => store);
    let r = mockRes();
    await h(mockReq('POST', { body: { name: ' 철수 ', avatar: 'chulsoo.png' } }), r.res);
    expect(r.out.status).toBe(201);
    const created = r.out.body as { id: string; name: string };
    expect(created.name).toBe('철수');

    r = mockRes();
    await h(mockReq('POST', { body: JSON.stringify({ name: '' }) }), r.res);
    expect(r.out.status).toBe(400);

    r = mockRes();
    await memberByIdHandler(() => store)(mockReq('PUT', { query: { id: created.id }, body: { active: false } }), r.res);
    expect(r.out.status).toBe(200);
    expect((r.out.body as { active: boolean }).active).toBe(false);

    r = mockRes();
    await memberByIdHandler(() => store)(mockReq('PUT', { query: { id: 'nope' }, body: { name: 'x' } }), r.res);
    expect(r.out.status).toBe(404);
  });

  it('POST /api/games 검증과 GET/DELETE', async () => {
    const store = new MemoryStore();
    const games = gamesHandler(() => store);
    let r = mockRes();
    await games(mockReq('POST', { body: validGame }), r.res);
    expect(r.out.status).toBe(201);
    const created = r.out.body as { id: string; scores: number[] };
    expect(created.scores).toEqual([38200, 27600, 21400, 12800]);

    r = mockRes();
    await games(mockReq('POST', { body: { ...validGame, playerIds: ['yeonkyung', 'yeonkyung', 'jisu', 'hyunwoo'] } }), r.res);
    expect(r.out.status).toBe(400);

    r = mockRes();
    await games(mockReq('POST', { body: { ...validGame, playerIds: ['ghost', 'minsu', 'jisu', 'hyunwoo'] } }), r.res);
    expect(r.out.status).toBe(400);

    r = mockRes();
    await games(mockReq('POST', { body: { ...validGame, gameType: 'weird' } }), r.res);
    expect(r.out.status).toBe(400);

    r = mockRes();
    await games(mockReq('GET'), r.res);
    expect((r.out.body as unknown[]).length).toBe(1);

    r = mockRes();
    await gameByIdHandler(() => store)(mockReq('DELETE', { query: { id: created.id } }), r.res);
    expect(r.out.status).toBe(200);

    r = mockRes();
    await gameByIdHandler(() => store)(mockReq('DELETE', { query: { id: created.id } }), r.res);
    expect(r.out.status).toBe(404);

    r = mockRes();
    await games(mockReq('PUT'), r.res);
    expect(r.out.status).toBe(405);
  });
});
