import { DEFAULT_RULES } from '../../config/rules';
import type { ScoringRules } from '../../config/rules';
import type { Game, Yakuman } from '../types';

/** 저장된 규칙이 없거나 깨져 있으면(우마 4개가 아님) 현재 기본 규칙으로 계산합니다 */
function validRules(rules: unknown): rules is ScoringRules {
  if (!rules || typeof rules !== 'object') return false;
  const r = rules as Partial<ScoringRules>;
  return typeof r.startPoints === 'number' && typeof r.returnPoints === 'number' && Array.isArray(r.uma) && r.uma.length === 4;
}

/**
 * 저장된 대국 레코드를 현재 스키마로 맞춥니다.
 * 예전 버전은 `title`(제목)·`memo`(한마디) 필드를 썼고 `place`·`yakumans` 가 없었습니다.
 * 동풍전 우마 배율이 1(반장전과 동일)이던 시절의 동풍전 기록은 현재 규칙(반장전의 절반)으로 다시 계산되도록 0.5 로 맞춥니다.
 * 규칙이 없거나 깨진 기록은 현재 기본 규칙으로 계산합니다 (화면이 통째로 깨지지 않도록).
 * 서버(GET /api/games)와 localStorage 저장소·스냅샷이 함께 사용합니다.
 */
export function normalizeGame(raw: Game & { title?: string; memo?: string }): Game {
  const { title: _title, memo: _memo, ...rest } = raw;
  void _title;
  void _memo;
  const place = typeof raw.place === 'string' ? raw.place : typeof raw.title === 'string' ? raw.title : '';
  const yakumans: Yakuman[] = Array.isArray(raw.yakumans)
    ? raw.yakumans.filter((y): y is Yakuman => !!y && typeof y.playerId === 'string' && typeof y.name === 'string')
    : [];
  const stored: ScoringRules = validRules(raw.rules) ? raw.rules : DEFAULT_RULES;
  const rules =
    raw.gameType === 'tonpuu' && stored.tonpuuUmaMultiplier === 1 ? { ...stored, tonpuuUmaMultiplier: DEFAULT_RULES.tonpuuUmaMultiplier } : stored;
  return { ...rest, place, yakumans, rules };
}
