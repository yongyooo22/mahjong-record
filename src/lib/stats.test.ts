import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../config/rules';
import type { Game, Member } from './types';
import {
  availableMonths,
  computeGroupSummary,
  computeMemberStats,
  computeMonthlySummary,
  computeRanking,
  gamesForMember,
  gamesInMonth,
  monthKey,
  previousMonthKey,
  sortGamesDesc,
} from './stats';

const members: Member[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
  id,
  name: id.toUpperCase(),
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
}));

function game(id: string, playedAt: string, playerIds: string[], scores: number[], yakumans: Game['yakumans'] = []): Game {
  return {
    id,
    playedAt,
    place: '',
    playerCount: 4,
    gameType: 'hanchan',
    playerIds,
    scores,
    yakumans,
    createdAt: playedAt,
    rules: DEFAULT_RULES,
  };
}

const g1 = game('g1', '2025-03-08T19:30:00', ['a', 'b', 'c', 'd'], [38200, 27600, 21400, 12800], [{ playerId: 'a', name: '국사무쌍' }]);
const g2 = game('g2', '2025-03-06T21:00:00', ['b', 'c', 'a', 'd'], [40000, 30000, 20000, 10000]);
const g3 = game('g3', '2025-02-20T20:00:00', ['a', 'b', 'c', 'e'], [10000, 20000, 30000, 40000]);

describe('월 키', () => {
  it('로컬 시간 기준 YYYY-MM', () => {
    expect(monthKey('2025-03-08T19:30:00')).toBe('2025-03');
    expect(previousMonthKey('2025-03')).toBe('2025-02');
    expect(previousMonthKey('2025-01')).toBe('2024-12');
  });

  it('월별 필터와 월 목록', () => {
    expect(gamesInMonth([g1, g2, g3], '2025-03').map((g) => g.id)).toEqual(['g1', 'g2']);
    expect(availableMonths([g3, g1, g2])).toEqual(['2025-03', '2025-02']);
    expect(sortGamesDesc([g3, g2, g1]).map((g) => g.id)).toEqual(['g1', 'g2', 'g3']);
  });
});

describe('멤버 통계', () => {
  it('누적 우마·평균 순위·순위 횟수를 계산한다', () => {
    const stats = computeMemberStats([g1, g2]);
    const a = stats.get('a')!;
    // g1: +28.2 (1위), g2: 20000 → -5-5 = -10 (3위)
    expect(a.games).toBe(2);
    expect(a.totalPoints).toBe(18.2);
    expect(a.avgRank).toBe(2);
    expect(a.avgPoints).toBe(9.1);
    expect(a.rankCounts).toEqual([1, 0, 1, 0]);
    expect(a.firstRate).toBe(50);
    expect(a.yakumanCount).toBe(1);

    const d = stats.get('d')!;
    expect(d.totalPoints).toBe(-57.2);
    expect(d.rankCounts).toEqual([0, 0, 0, 2]);
  });

  it('대국이 없는 멤버는 빈 통계', () => {
    const stats = computeMemberStats([], ['z']);
    expect(stats.get('z')).toMatchObject({ games: 0, totalPoints: 0, avgRank: null, avgPoints: null, yakumanCount: 0 });
  });
});

describe('랭킹', () => {
  it('누적 우마 기준으로 정렬하고 대국 없는 멤버는 제외', () => {
    const rows = computeRanking([g1, g2], members);
    expect(rows.map((r) => r.member.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3, 4]);
    expect(rows[0].totalPoints).toBe(37.6); // b: +7.6 + 30
  });

  it('월별 랭킹은 해당 월의 대국만 반영', () => {
    const feb = computeRanking(gamesInMonth([g1, g2, g3], '2025-02'), members);
    expect(feb.map((r) => r.member.id)).toEqual(['e', 'c', 'b', 'a']);
    expect(feb[0].totalPoints).toBe(30);
  });
});

describe('월 요약', () => {
  it('지난달 대비 증감을 계산한다', () => {
    const s = computeMonthlySummary([g1, g2, g3], 'a', '2025-03');
    expect(s.games).toEqual({ current: 2, previous: 1, delta: 1 });
    expect(s.avgRank).toEqual({ current: 2, previous: 4, delta: -2 });
    expect(s.avgPoints).toEqual({ current: 9.1, previous: -30, delta: 39.1 });
    expect(s.firstCount).toEqual({ current: 1, previous: 0, delta: 1 });
    expect(s.lastCount).toEqual({ current: 0, previous: 1, delta: -1 });
    expect(s.totalPoints).toEqual({ current: 18.2, previous: -30, delta: 48.2 });
  });

  it('지난달 기록이 없으면 증감은 null', () => {
    const s = computeMonthlySummary([g1, g2], 'a', '2025-03');
    expect(s.avgRank.delta).toBeNull();
    expect(s.totalPoints.delta).toBeNull();
  });
});

describe('모임 요약', () => {
  it('대국 수·최다 참여·평균 우마 1위·1위 최다를 계산한다', () => {
    const s = computeGroupSummary([g1, g2, g3], '2025-03');
    expect(s.games).toEqual({ current: 2, previous: 1, delta: 1 });
    // 모두 2국씩 참여 → 4명 전원 동률
    expect(s.mostActive).toEqual({ memberIds: ['a', 'b', 'c', 'd'], value: 2, candidates: 4 });
    // b: 7.6 + 30 = 37.6, 평균 18.8
    expect(s.bestTotal).toEqual({ memberIds: ['b'], value: 37.6, candidates: 4 });
    expect(s.bestAverage).toEqual({ memberIds: ['b'], value: 18.8, candidates: 4 });
    // 1위: g1 a, g2 b → 각 1회 동률
    expect(s.topFirst).toEqual({ memberIds: ['a', 'b'], value: 1, candidates: 4 });
  });

  it('지난달 기록이 없으면 증감은 null, 대국이 없으면 최다는 null', () => {
    const s = computeGroupSummary([g3], '2025-02');
    expect(s.games).toEqual({ current: 1, previous: null, delta: null });
    expect(computeGroupSummary([], '2025-02').topFirst).toBeNull();
    expect(computeGroupSummary([], '2025-02').mostActive).toBeNull();
  });
});

describe('멤버별 대국', () => {
  it('참여한 대국만 최신순으로, 본인 순위와 점수를 붙인다', () => {
    const rows = gamesForMember([g3, g2, g1], 'a');
    expect(rows.map((r) => r.game.id)).toEqual(['g1', 'g2', 'g3']);
    expect(rows[0]).toMatchObject({ rank: 1, score: 38200, points: 28.2 });
    expect(rows[2]).toMatchObject({ rank: 4, score: 10000 });
    expect(gamesForMember([g1], 'e')).toEqual([]);
  });
});
