import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../../config/rules';
import { LocalStorageAdapter } from './LocalStorage';

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('비어 있으면 샘플 멤버를 한 번만 시드한다', async () => {
    const a = new LocalStorageAdapter();
    const first = await a.listMembers();
    expect(first.map((m) => m.name)).toEqual(['연경', '영식', '소원', '찬영']);
    await a.addMember({ name: '새멤버' });
    const b = new LocalStorageAdapter();
    expect((await b.listMembers()).length).toBe(5);
  });

  it('멤버 추가/수정', async () => {
    const a = new LocalStorageAdapter();
    const m = await a.addMember({ name: '  철수 ', avatar: 'chulsoo.png' });
    expect(m.name).toBe('철수');
    expect(m.avatar).toBe('chulsoo.png');
    const u = await a.updateMember(m.id, { active: false, avatar: '' });
    expect(u.active).toBe(false);
    expect(u.avatar).toBeNull();
    await expect(a.addMember({ name: '   ' })).rejects.toThrow();
    await expect(a.updateMember('nope', { name: 'x' })).rejects.toThrow();
  });

  it('대국 추가/삭제가 새 인스턴스에서도 유지된다', async () => {
    const a = new LocalStorageAdapter();
    const g = await a.addGame({
      playedAt: '2025-03-08T19:30:00.000Z',
      place: '이수마장',
      playerCount: 4,
      gameType: 'hanchan',
      playerIds: ['yeonkyung', 'youngsik', 'sowon', 'chanyoung'],
      scores: [38200, 27600, 21400, 12800],
      yakumans: [],
      rules: DEFAULT_RULES,
    });
    expect(g.id).toMatch(/^g-/);
    const b = new LocalStorageAdapter();
    expect((await b.listGames()).map((x) => x.id)).toEqual([g.id]);
    await b.deleteGame(g.id);
    expect(await new LocalStorageAdapter().listGames()).toEqual([]);
    await expect(b.deleteGame(g.id)).rejects.toThrow();
  });

  it('예전 형식(title/memo) 기록은 place/yakumans 로 읽힌다', async () => {
    window.localStorage.setItem(
      'mahjong.games',
      JSON.stringify([{ id: 'g-old', playedAt: '2025-03-08T19:30:00.000Z', title: '옛 제목', memo: '한마디', playerCount: 4, gameType: 'hanchan', playerIds: ['a', 'b', 'c', 'd'], scores: [25000, 25000, 25000, 25000], createdAt: '', rules: DEFAULT_RULES }]),
    );
    const [g] = await new LocalStorageAdapter().listGames();
    expect(g.place).toBe('옛 제목');
    expect(g.yakumans).toEqual([]);
    expect('title' in g).toBe(false);
  });

  it('예전 동풍전 기록(우마 배율 1)은 절반 우마로 다시 계산된다', async () => {
    const base = { playedAt: '2025-03-08T19:30:00.000Z', place: '', yakumans: [], playerCount: 4, playerIds: ['a', 'b', 'c', 'd'], scores: [25000, 25000, 25000, 25000], createdAt: '' };
    window.localStorage.setItem(
      'mahjong.games',
      JSON.stringify([
        { ...base, id: 'g-t', gameType: 'tonpuu', rules: { ...DEFAULT_RULES, tonpuuUmaMultiplier: 1 } },
        { ...base, id: 'g-h', gameType: 'hanchan', rules: { ...DEFAULT_RULES, tonpuuUmaMultiplier: 1 } },
      ]),
    );
    const games = await new LocalStorageAdapter().listGames();
    expect(games.find((g) => g.id === 'g-t')?.rules.tonpuuUmaMultiplier).toBe(0.5);
    expect(games.find((g) => g.id === 'g-h')?.rules.tonpuuUmaMultiplier).toBe(1);
  });

  it('손대지 않은 예전 초기 멤버는 새 초기 멤버로 교체한다', async () => {
    const legacy = [
      { id: 'yeonkyung', name: '연경' },
      { id: 'minsu', name: '민수' },
      { id: 'jisu', name: '지수' },
      { id: 'hyunwoo', name: '현우' },
    ].map((m) => ({ ...m, avatar: null, active: true, createdAt: '2025-01-01T00:00:00.000Z' }));
    window.localStorage.setItem('mahjong.members', JSON.stringify(legacy));
    expect((await new LocalStorageAdapter().listMembers()).map((m) => m.id)).toEqual(['yeonkyung', 'youngsik', 'sowon', 'chanyoung']);

    // 이름을 바꾼 흔적이 있으면 그대로 둔다
    window.localStorage.setItem('mahjong.members', JSON.stringify([{ ...legacy[0], name: '연경이' }, ...legacy.slice(1)]));
    expect((await new LocalStorageAdapter().listMembers()).map((m) => m.id)).toEqual(['yeonkyung', 'minsu', 'jisu', 'hyunwoo']);
  });
});
