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
  place: '마작카페',
  playerCount: 4,
  gameType: 'hanchan',
  playerIds: ['yeonkyung', 'youngsik', 'sowon', 'chanyoung'],
  scores: [38200, 27600, 21400, 12800],
  yakumans: [{ playerId: 'yeonkyung', name: '국사무쌍' }],
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
    expect((out.body as { name: string }[]).map((m) => m.name)).toEqual(['연경', '영식', '소원', '찬영']);
    expect(store.members?.length).toBe(4);
  });

  it('손대지 않은 예전 초기 멤버는 새 초기 멤버로 교체하고, 기록이 있으면 그대로 둔다', async () => {
    const legacy = ['yeonkyung:연경', 'minsu:민수', 'jisu:지수', 'hyunwoo:현우'].map((s) => {
      const [id, name] = s.split(':');
      return { id, name, avatar: null, active: true, createdAt: '2025-01-01T00:00:00.000Z' };
    });
    const store = new MemoryStore();
    store.members = [...legacy];
    let r = mockRes();
    await membersHandler(() => store)(mockReq('GET'), r.res);
    expect((r.out.body as { id: string }[]).map((m) => m.id)).toEqual(['yeonkyung', 'youngsik', 'sowon', 'chanyoung']);

    const withGame = new MemoryStore();
    withGame.members = [...legacy];
    withGame.games.set('g', { ...validGame, playerIds: ['yeonkyung', 'minsu', 'jisu', 'hyunwoo'], yakumans: [], id: 'g', createdAt: '' } as never);
    r = mockRes();
    await membersHandler(() => withGame)(mockReq('GET'), r.res);
    expect((r.out.body as { id: string }[]).map((m) => m.id)).toEqual(['yeonkyung', 'minsu', 'jisu', 'hyunwoo']);
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
    const created = r.out.body as { id: string; scores: number[]; place: string; yakumans: unknown[] };
    expect(created.scores).toEqual([38200, 27600, 21400, 12800]);
    expect(created.place).toBe('마작카페');
    expect(created.yakumans).toEqual([{ playerId: 'yeonkyung', name: '국사무쌍' }]);

    r = mockRes();
    await games(mockReq('POST', { body: { ...validGame, playerIds: ['yeonkyung', 'yeonkyung', 'sowon', 'chanyoung'] } }), r.res);
    expect(r.out.status).toBe(400);

    r = mockRes();
    await games(mockReq('POST', { body: { ...validGame, playerIds: ['ghost', 'youngsik', 'sowon', 'chanyoung'] } }), r.res);
    expect(r.out.status).toBe(400);

    r = mockRes();
    await games(mockReq('POST', { body: { ...validGame, yakumans: [{ playerId: 'ghost', name: '대삼원' }] } }), r.res);
    expect(r.out.status).toBe(400);

    r = mockRes();
    await games(mockReq('POST', { body: { ...validGame, gameType: 'weird' } }), r.res);
    expect(r.out.status).toBe(400);

    // 예전 형식(title/memo)으로 저장된 기록도 place/yakumans 로 읽힌다
    store.games.set('old', { id: 'old', playedAt: '2025-01-01T00:00:00.000Z', title: '옛 제목', memo: 'x', playerCount: 4, gameType: 'hanchan', playerIds: validGame.playerIds, scores: validGame.scores, createdAt: '', rules: DEFAULT_RULES } as never);
    r = mockRes();
    await games(mockReq('GET'), r.res);
    const listed = r.out.body as { id: string; place: string; yakumans: unknown[]; title?: string }[];
    expect(listed.length).toBe(2);
    const old = listed.find((g) => g.id === 'old')!;
    expect(old.place).toBe('옛 제목');
    expect(old.yakumans).toEqual([]);
    expect(old.title).toBeUndefined();
    store.games.delete('old');

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
