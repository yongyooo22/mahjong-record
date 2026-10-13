import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../../config/rules';
import type { Game } from '../types';
import { normalizeGame } from './normalize';

const base: Game = {
  id: 'g1',
  playedAt: '2025-03-08T10:30:00.000Z',
  place: '마작카페',
  playerCount: 4,
  gameType: 'hanchan',
  playerIds: ['a', 'b', 'c', 'd'],
  scores: [38200, 27600, 21400, 12800],
  yakumans: [],
  createdAt: '2025-03-08T10:30:00.000Z',
  rules: DEFAULT_RULES,
};

describe('대국 레코드 정규화', () => {
  it('현재 형식은 그대로', () => {
    expect(normalizeGame(base)).toEqual(base);
  });

  it('예전 형식: title 을 place 로, memo 는 버리고, yakumans 가 없으면 빈 배열', () => {
    const legacy: Record<string, unknown> = { ...base, title: '옛 제목', memo: '한마디' };
    delete legacy.place;
    delete legacy.yakumans;
    const g = normalizeGame(legacy as unknown as Game & { title: string; memo: string });
    expect(g.place).toBe('옛 제목');
    expect(g.yakumans).toEqual([]);
    expect(g).not.toHaveProperty('title');
    expect(g).not.toHaveProperty('memo');
  });

  it('형식이 맞지 않는 역만 항목은 걸러낸다', () => {
    const g = normalizeGame({ ...base, yakumans: [{ playerId: 'a', name: '국사무쌍' }, { playerId: 'b' }, null, 'x'] as unknown as Game['yakumans'] });
    expect(g.yakumans).toEqual([{ playerId: 'a', name: '국사무쌍' }]);
  });

  it('규칙이 없거나 깨진 기록은 기본 규칙으로 계산한다', () => {
    const { rules: _r, ...noRules } = base;
    void _r;
    expect(normalizeGame(noRules as Game).rules).toEqual(DEFAULT_RULES);
    expect(normalizeGame({ ...base, rules: { startPoints: 25000 } as unknown as Game['rules'] }).rules).toEqual(DEFAULT_RULES);
    expect(normalizeGame({ ...base, rules: { ...DEFAULT_RULES, uma: [10, 5] } as unknown as Game['rules'] }).rules).toEqual(DEFAULT_RULES);
  });

  it('동풍전 우마 배율이 1이던 시절의 기록은 현재 기본 배율로, 반장전은 그대로', () => {
    const rules = { ...DEFAULT_RULES, tonpuuUmaMultiplier: 1 };
    expect(normalizeGame({ ...base, gameType: 'tonpuu', rules }).rules.tonpuuUmaMultiplier).toBe(DEFAULT_RULES.tonpuuUmaMultiplier);
    expect(normalizeGame({ ...base, gameType: 'hanchan', rules }).rules.tonpuuUmaMultiplier).toBe(1);
  });
});
