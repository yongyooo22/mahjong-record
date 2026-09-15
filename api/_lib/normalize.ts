import type { Game, Yakuman } from '../../src/lib/types';

/**
 * 저장된 대국 레코드를 현재 스키마로 맞춥니다.
 * 예전 버전은 `title`(제목)·`memo`(한마디) 필드를 썼고 `place`·`yakumans` 가 없었습니다.
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
  return { ...rest, place, yakumans };
}
