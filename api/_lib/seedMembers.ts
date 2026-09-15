/**
 * 저장소가 비어 있을 때 한 번만 시드되는 초기 멤버.
 * 서버(api/)와 클라이언트(src/) 가 함께 사용합니다 — src/config/seedMembers.ts 에서 재수출.
 */
export const SEED_MEMBERS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'yeonkyung', name: '연경' },
  { id: 'youngsik', name: '영식' },
  { id: 'sowon', name: '소원' },
  { id: 'chanyoung', name: '찬영' },
];

export const SEED_CREATED_AT = '2025-01-01T00:00:00.000Z';

/** 예전 버전의 초기 멤버 (연경·민수·지수·현우). 손대지 않은 채 남아 있으면 새 초기 멤버로 교체합니다. */
const LEGACY_SEED: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'yeonkyung', name: '연경' },
  { id: 'minsu', name: '민수' },
  { id: 'jisu', name: '지수' },
  { id: 'hyunwoo', name: '현우' },
];

/**
 * 저장된 멤버가 예전 초기 멤버 그대로(이름·ID 모두 동일, 추가·수정 없음)인지.
 * 대국 기록이 하나라도 있으면 교체하지 않도록 호출하는 쪽에서 함께 확인합니다.
 */
export function isUntouchedLegacySeed(members: ReadonlyArray<{ id: string; name: string; avatar?: string | null; active?: boolean }>): boolean {
  if (members.length !== LEGACY_SEED.length) return false;
  return LEGACY_SEED.every((seed, i) => {
    const m = members[i];
    return m.id === seed.id && m.name === seed.name && !m.avatar && m.active !== false;
  });
}
