/**
 * 대국 장소 기본 목록. 기록 화면의 장소 선택에 항상 나타나며,
 * 새로 추가한 장소는 이 기기(localStorage)에 기억되고, 기록에 저장된 장소는 모두에게 보입니다.
 */
export const DEFAULT_PLACES: readonly string[] = ['마작카페', '이수마장'];

export const PLACE_MAX_LENGTH = 40;

const CUSTOM_PLACES_KEY = 'mahjong.places';

export function readCustomPlaces(): string[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_PLACES_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((p): p is string => typeof p === 'string' && p.trim() !== '') : [];
  } catch {
    return [];
  }
}

export function saveCustomPlace(place: string): void {
  const next = [...readCustomPlaces().filter((p) => p !== place), place];
  try {
    window.localStorage.setItem(CUSTOM_PLACES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** 기본 장소 + 기록에 쓰인 장소 + 이 기기에서 추가한 장소 (중복 제거, 순서 유지) */
export function mergePlaces(fromGames: readonly string[], custom: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of [...DEFAULT_PLACES, ...fromGames, ...custom]) {
    const v = p.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
