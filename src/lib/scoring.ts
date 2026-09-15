import { DEFAULT_RULES, type GameType, type ScoringRules } from '../config/rules';

export interface PlayerResult {
  /** 입력 순서 인덱스 */
  index: number;
  score: number;
  /** 1부터 시작하는 순위 */
  rank: number;
  /** 우마 (규칙·대국 방식 반영) */
  uma: number;
  /** 최종 정산 점수 = (원점수 - 반환점) / 1000 + 우마 */
  points: number;
  /** 같은 점수의 다른 플레이어가 있는지 */
  tied: boolean;
}

/** 부동소수 오차를 없애기 위해 소수 첫째 자리로 반올림 */
export function round1(n: number): number {
  const r = Math.round((n + Number.EPSILON * Math.sign(n)) * 10) / 10;
  return r === 0 ? 0 : r; // -0 방지
}

/**
 * 원점수 배열로 순위를 계산합니다.
 * 점수가 높은 순으로 1위부터 매기고, 동점이면 입력 순서가 빠른 쪽이 상위입니다.
 */
export function computeRanks(scores: number[]): number[] {
  const order = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const ranks = new Array<number>(scores.length);
  order.forEach((item, position) => {
    ranks[item.index] = position + 1;
  });
  return ranks;
}

/** 순위별 우마 값 (동풍전은 배율 적용) */
export function umaForRank(rank: number, rules: ScoringRules, gameType: GameType): number {
  const base = rules.uma[rank - 1] ?? 0;
  const multiplier = gameType === 'tonpuu' ? rules.tonpuuUmaMultiplier : 1;
  return round1(base * multiplier);
}

/** 한 플레이어의 최종 정산 점수 */
export function computePoints(
  score: number,
  rank: number,
  rules: ScoringRules,
  gameType: GameType,
): number {
  return round1((score - rules.returnPoints) / 1000 + umaForRank(rank, rules, gameType));
}

/** 대국 하나의 결과를 입력 순서대로 계산합니다. */
export function computeResults(
  scores: number[],
  rules: ScoringRules = DEFAULT_RULES,
  gameType: GameType = 'hanchan',
): PlayerResult[] {
  const ranks = computeRanks(scores);
  return scores.map((score, index) => {
    const rank = ranks[index];
    const tied = scores.some((s, i) => i !== index && s === score);
    return {
      index,
      score,
      rank,
      uma: umaForRank(rank, rules, gameType),
      points: computePoints(score, rank, rules, gameType),
      tied,
    };
  });
}

/** 점수 합계와 기대 합계의 차이 */
export function scoreTotalDiff(scores: number[], rules: ScoringRules, playerCount: number): {
  total: number;
  expected: number;
  diff: number;
} {
  const total = scores.reduce((a, b) => a + b, 0);
  const expected = rules.startPoints * playerCount;
  return { total, expected, diff: total - expected };
}

/** 동점이 있는지 */
export function hasTie(scores: number[]): boolean {
  return new Set(scores).size !== scores.length;
}

/** 동점 그룹 (인덱스 배열) — 길이 2 이상인 그룹만 */
export function tieGroups(scores: number[]): number[][] {
  const map = new Map<number, number[]>();
  scores.forEach((s, i) => {
    const arr = map.get(s) ?? [];
    arr.push(i);
    map.set(s, arr);
  });
  return [...map.values()].filter((g) => g.length > 1);
}

/** 정산 점수 표시용 문자열 (+28.2 / −8.6 / 0.0) */
export function formatPoints(points: number, opts: { plusSign?: boolean } = { plusSign: true }): string {
  const r = round1(points);
  const abs = Math.abs(r).toFixed(1);
  if (r > 0) return `${opts.plusSign === false ? '' : '+'}${abs}`;
  if (r < 0) return `-${abs}`;
  return '0.0';
}

/** 원점수 표시 (38,200) */
export function formatScore(score: number): string {
  return score.toLocaleString('ko-KR');
}
