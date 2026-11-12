import type { Game, Yakuman } from '../../src/lib/types';

/** 동풍전 우마 배율 (src/config/rules.ts 의 DEFAULT_RULES.tonpuuUmaMultiplier 와 같은 값) */
const TONPUU_UMA_MULTIPLIER = 0.5;

/** 2026년 11월부터의 우마 (src/config/rules.ts 의 DEFAULT_RULES.uma 와 같은 값)와 그 전 우마 */
const OLD_UMA = [15, 5, -5, -15];
const NEW_UMA: [number, number, number, number] = [20, 10, -10, -20];
/** 새 우마를 적용하는 첫 순간: 2026년 11월 1일 0시 (한국 시간) */
const NEW_UMA_FROM = Date.parse('2026-11-01T00:00:00+09:00');

function sameUma(uma: readonly number[] | undefined, expected: readonly number[]): boolean {
  return Array.isArray(uma) && uma.length === expected.length && uma.every((u, i) => u === expected[i]);
}

/**
 * 저장된 대국 레코드를 현재 스키마로 맞춥니다.
 * 예전 버전은 `title`(제목)·`memo`(한마디) 필드를 썼고 `place`·`yakumans` 가 없었습니다.
 * 동풍전 우마 배율이 1(반장전과 동일)이던 시절의 동풍전 기록은 현재 규칙(반장전의 절반)으로 다시 계산되도록 0.5 로 맞춥니다.
 * 2026년 11월 1일(한국 시간) 이후 대국인데 예전 우마(+15/+5/-5/-15)로 저장된 기록은 새 우마(+20/+10/-10/-20)로 맞춥니다.
 * 서버(GET /api/games)와 localStorage 저장소가 함께 사용합니다.
 */
export function normalizeGame(raw: Game & { title?: string; memo?: string }): Game {
  const { title: _title, memo: _memo, ...rest } = raw;
  void _title;
  void _memo;
  const place = typeof raw.place === 'string' ? raw.place : typeof raw.title === 'string' ? raw.title : '';
  const yakumans: Yakuman[] = Array.isArray(raw.yakumans)
    ? raw.yakumans.filter((y): y is Yakuman => !!y && typeof y.playerId === 'string' && typeof y.name === 'string')
    : [];
  let rules = raw.rules;
  if (raw.gameType === 'tonpuu' && rules && rules.tonpuuUmaMultiplier === 1) {
    rules = { ...rules, tonpuuUmaMultiplier: TONPUU_UMA_MULTIPLIER };
  }
  if (rules && sameUma(rules.uma, OLD_UMA) && Date.parse(raw.playedAt) >= NEW_UMA_FROM) {
    rules = { ...rules, uma: [...NEW_UMA] };
  }
  return { ...rest, place, yakumans, rules };
}
