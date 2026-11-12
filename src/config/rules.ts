/**
 * 정산 규칙 설정.
 * 25,000점 시작 / 25,000점 반환(오카 없음), 우마 +20/+10/-10/-20 (동풍전은 절반).
 * 2026년 11월부터의 규칙입니다. 그 전에는 우마 +15/+5/-5/-15 였고, 11월 기록은 새 우마로 다시 계산합니다 (api/_lib/normalize.ts).
 * 나중에 규칙을 바꾸려면 이 파일의 값만 수정하면 됩니다.
 */
export type GameType = 'hanchan' | 'tonpuu';

export interface ScoringRules {
  /** 시작 점수 */
  startPoints: number;
  /** 반환 점수 (오카를 쓰려면 시작 점수보다 크게 설정) */
  returnPoints: number;
  /** 순위별 우마 (1위 → 4위 순) */
  uma: [number, number, number, number];
  /** 동풍전 우마 배율 (1이면 반장전과 동일) */
  tonpuuUmaMultiplier: number;
}

export const DEFAULT_RULES: ScoringRules = {
  startPoints: 25000,
  returnPoints: 25000,
  uma: [20, 10, -10, -20],
  tonpuuUmaMultiplier: 0.5,
};

export const GAME_TYPE_LABEL: Record<GameType, string> = {
  hanchan: '반장전',
  tonpuu: '동풍전',
};

/** 4인 대국의 정상적인 점수 합계 (시작 점수 × 인원) */
export function expectedTotal(rules: ScoringRules, playerCount: number): number {
  return rules.startPoints * playerCount;
}
