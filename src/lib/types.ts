import type { GameType, ScoringRules } from '../config/rules';

export interface Member {
  id: string;
  name: string;
  /** 아바타 파일명 (public/images/avatars/ 기준). 비어 있으면 `<id>.png` */
  avatar?: string | null;
  active: boolean;
  createdAt: string;
}

/** 대국 중 나온 역만 한 건 */
export interface Yakuman {
  /** 역만을 낸 참가자 ID */
  playerId: string;
  /** 역만 이름 (예: 국사무쌍) */
  name: string;
}

export interface Game {
  id: string;
  /** 대국 일시 (ISO 문자열) */
  playedAt: string;
  /** 대국 장소 (예: 마작카페) */
  place: string;
  playerCount: number;
  gameType: GameType;
  /** 참가자 ID (입력 순서 유지 — 동점 시 앞쪽이 상위) */
  playerIds: string[];
  /** 참가자별 최종 원점수 (playerIds 와 같은 순서) */
  scores: number[];
  /** 이 대국에서 나온 역만 (없으면 빈 배열) */
  yakumans: Yakuman[];
  createdAt: string;
  /** 저장 당시 적용된 정산 규칙 */
  rules: ScoringRules;
}

/** 후원 상태: 진행 중 → 달성(상품 지급 대기) → 상품 지급 완료 */
export type SponsorStatus = 'open' | 'achieved' | 'paid';

/** 후원 한 건 — 누군가 조건을 걸고 상품을 겁니다 (예: 1호 역만 → 메가커피 기프티콘) */
export interface Sponsor {
  id: string;
  /** 제목 (예: 1호 역만) */
  title: string;
  /** 달성 조건·설명 (예: 마고모 1호 역만, 카조에 제외). 비어 있을 수 있음 */
  condition: string;
  /** 상품 (예: 메가커피 기프티콘) */
  prize: string;
  /** 후원자 멤버 ID. 멤버가 아닌 사람이 후원하면 null */
  sponsorId: string | null;
  /** 후원자 이름 (멤버면 저장 당시 이름, 아니면 직접 입력한 이름) */
  sponsorName: string;
  status: SponsorStatus;
  /** 달성한 멤버 ID (진행 중이면 null) */
  achieverId: string | null;
  /** 달성일 (ISO 문자열, 진행 중이면 null) */
  achievedAt: string | null;
  /** 상품 지급 완료일 (ISO 문자열, 지급 완료일 때만) */
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewMember = Pick<Member, 'name' | 'avatar'> & Partial<Pick<Member, 'id' | 'active'>>;
export type MemberPatch = Partial<Pick<Member, 'name' | 'avatar' | 'active'>>;
export type NewGame = Omit<Game, 'id' | 'createdAt'>;
export type NewSponsor = Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt'>;
export type SponsorPatch = Partial<NewSponsor>;
