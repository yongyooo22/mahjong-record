import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../config/rules';
import {
  computePoints,
  computeRanks,
  computeResults,
  formatPoints,
  hasTie,
  round1,
  scoreTotalDiff,
  tieGroups,
  umaForRank,
} from './scoring';

describe('computeRanks', () => {
  it('점수가 높은 순서대로 순위를 매긴다', () => {
    expect(computeRanks([38200, 27600, 21400, 12800])).toEqual([1, 2, 3, 4]);
    expect(computeRanks([12800, 21400, 27600, 38200])).toEqual([4, 3, 2, 1]);
  });

  it('동점이면 입력 순서가 빠른 쪽이 상위', () => {
    expect(computeRanks([25000, 25000, 25000, 25000])).toEqual([1, 2, 3, 4]);
    expect(computeRanks([20000, 30000, 30000, 20000])).toEqual([3, 1, 2, 4]);
  });
});

describe('computePoints / 검산 예시', () => {
  it('38,200점 1위 → +33.2', () => {
    expect(computePoints(38200, 1, DEFAULT_RULES, 'hanchan')).toBe(33.2);
  });

  it('38,200 / 27,600 / 21,400 / 12,800 → +33.2 / +12.6 / -13.6 / -32.2 (합계 0)', () => {
    const results = computeResults([38200, 27600, 21400, 12800]);
    expect(results.map((r) => r.points)).toEqual([33.2, 12.6, -13.6, -32.2]);
    expect(results.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
    expect(results.map((r) => r.uma)).toEqual([20, 10, -10, -20]);
    expect(round1(results.reduce((a, r) => a + r.points, 0))).toBe(0);
  });

  it('입력 순서가 달라도 각 플레이어의 결과는 같다', () => {
    const results = computeResults([12800, 38200, 21400, 27600]);
    expect(results.map((r) => r.points)).toEqual([-32.2, 33.2, -13.6, 12.6]);
    expect(results.map((r) => r.rank)).toEqual([4, 1, 3, 2]);
  });

  it('동풍전 배율이 우마에 적용된다', () => {
    const rules = { ...DEFAULT_RULES, tonpuuUmaMultiplier: 0.5 };
    expect(umaForRank(1, rules, 'tonpuu')).toBe(10);
    expect(umaForRank(2, rules, 'tonpuu')).toBe(5);
    expect(umaForRank(4, rules, 'tonpuu')).toBe(-10);
    expect(umaForRank(1, rules, 'hanchan')).toBe(20);
    expect(computePoints(38200, 1, rules, 'tonpuu')).toBe(23.2);
  });

  it('반환점(오카)이 다르면 정산 점수가 달라진다', () => {
    const rules = { ...DEFAULT_RULES, returnPoints: 30000 };
    expect(computePoints(38200, 1, rules, 'hanchan')).toBe(28.2);
  });

  it('동점 플래그를 표시한다', () => {
    const results = computeResults([30000, 30000, 20000, 20000]);
    expect(results.map((r) => r.tied)).toEqual([true, true, true, true]);
    expect(computeResults([38200, 27600, 21400, 12800]).every((r) => !r.tied)).toBe(true);
  });
});

describe('검증 도우미', () => {
  it('합계 차이를 계산한다', () => {
    expect(scoreTotalDiff([38200, 27600, 21400, 12800], DEFAULT_RULES, 4)).toEqual({
      total: 100000,
      expected: 100000,
      diff: 0,
    });
    expect(scoreTotalDiff([38200, 27600, 21400, 12000], DEFAULT_RULES, 4).diff).toBe(-800);
  });

  it('동점 그룹을 찾는다', () => {
    expect(hasTie([1, 2, 3, 4])).toBe(false);
    expect(hasTie([1, 1, 3, 4])).toBe(true);
    expect(tieGroups([25000, 30000, 25000, 20000])).toEqual([[0, 2]]);
  });
});

describe('formatPoints', () => {
  it('부호와 소수 첫째 자리를 표시한다', () => {
    expect(formatPoints(28.2)).toBe('+28.2');
    expect(formatPoints(-8.6)).toBe('-8.6');
    expect(formatPoints(0)).toBe('0.0');
    expect(formatPoints(-0.04)).toBe('0.0');
    expect(formatPoints(5)).toBe('+5.0');
  });
});
