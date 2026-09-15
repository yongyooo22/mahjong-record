/**
 * 저장소가 비어 있을 때 한 번만 시드되는 초기 멤버.
 * 서버(api/)와 클라이언트(src/) 가 함께 사용합니다 — src/config/seedMembers.ts 에서 재수출.
 */
export const SEED_MEMBERS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'yeonkyung', name: '연경' },
  { id: 'minsu', name: '민수' },
  { id: 'jisu', name: '지수' },
  { id: 'hyunwoo', name: '현우' },
];

export const SEED_CREATED_AT = '2025-01-01T00:00:00.000Z';
