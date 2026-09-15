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
    expect(first.map((m) => m.name)).toEqual(['연경', '민수', '지수', '현우']);
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
      title: '저녁 한판',
      playerCount: 4,
      gameType: 'hanchan',
      playerIds: ['yeonkyung', 'minsu', 'jisu', 'hyunwoo'],
      scores: [38200, 27600, 21400, 12800],
      memo: '',
      rules: DEFAULT_RULES,
    });
    expect(g.id).toMatch(/^g-/);
    const b = new LocalStorageAdapter();
    expect((await b.listGames()).map((x) => x.id)).toEqual([g.id]);
    await b.deleteGame(g.id);
    expect(await new LocalStorageAdapter().listGames()).toEqual([]);
    await expect(b.deleteGame(g.id)).rejects.toThrow();
  });
});
